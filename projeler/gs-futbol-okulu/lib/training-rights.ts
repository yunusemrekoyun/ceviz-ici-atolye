import { and, asc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { groupSchedules, trainingSessions } from "@/lib/db/schema";
import { addDaysTo, parseDay } from "@/lib/dates";
import { SESSIONS_PER_PACK } from "@/lib/billing-shared";
import { isoToIstanbulLocal } from "@/lib/format";

/**
 * Antrenman hakkı: aidat bir "paket" = grubun sıradaki 8 antrenmanı. Antrenman günü gelince öğrenci gelse de
 * gelmese de hak düşer; iptal edilen antrenman hak yemez. Hak bir sayaç olarak değil, yenileme tarihi
 * (paketi aşan ilk antrenman) olarak gösterilir.
 *
 * Antrenman günleri: programda üretilmiş seanslar (iptal olmayanlar); üretilmemiş günler için grubun haftalık
 * programı; programı yoksa hafta sonu (Cumartesi + Pazar).
 */
export { SESSIONS_PER_PACK };
export const DEFAULT_WEEKDAYS = [6, 7] as const;

type Slot = { weekday: number; validFrom: string | null; validTo: string | null };

/** "YYYY-MM-DD" → 1 (Pazartesi) … 7 (Pazar) */
function weekdayOf(day: string): number {
  const { y, m, d } = parseDay(day);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return js === 0 ? 7 : js;
}

function projected(slots: Slot[], day: string): number {
  const wd = weekdayOf(day);
  return slots.filter((s) => s.weekday === wd && (!s.validFrom || day >= s.validFrom) && (!s.validTo || day <= s.validTo)).length;
}

/**
 * Grubun `from` gününden (dahil) itibaren ilk `count` antrenman günü (aynı gün iki antrenman varsa iki kez).
 * Üretilmiş seans aralığındaki günler için seanslar esas alınır; aralığın dışı haftalık plandan tahmin edilir.
 */
export function groupSessionDates(groupId: number | null, from: string, count: number): string[] {
  const db = getDb();
  const sessions = groupId
    ? db
        .select({ date: trainingSessions.date, status: trainingSessions.status })
        .from(trainingSessions)
        .where(and(eq(trainingSessions.groupId, groupId), gte(trainingSessions.date, addDaysTo(from, -60))))
        .orderBy(asc(trainingSessions.date), asc(trainingSessions.startTime))
        .all()
    : [];
  const schedule: Slot[] = groupId ? db.select({ weekday: groupSchedules.weekday, validFrom: groupSchedules.validFrom, validTo: groupSchedules.validTo }).from(groupSchedules).where(eq(groupSchedules.groupId, groupId)).all() : [];
  const slots: Slot[] = schedule.length ? schedule : DEFAULT_WEEKDAYS.map((weekday) => ({ weekday, validFrom: null, validTo: null }));

  // Üretilmiş seansların kapsadığı aralık (iptaller dahil): bu aralıkta tahmin yapılmaz.
  const first = sessions[0]?.date ?? null;
  const last = sessions.at(-1)?.date ?? null;
  const real = new Map<string, number>();
  for (const s of sessions) if (s.status !== "cancelled") real.set(s.date, (real.get(s.date) ?? 0) + 1);

  const out: string[] = [];
  let day = from;
  for (let guard = 0; out.length < count && guard < 800; guard++, day = addDaysTo(day, 1)) {
    const n = first && last && day >= first && day <= last ? (real.get(day) ?? 0) : projected(slots, day);
    for (let i = 0; i < n && out.length < count; i++) out.push(day);
  }
  return out;
}

/** Bugünden (dahil) `until` gününe (hariç) kadar kalan antrenman sayısı. */
export function sessionsBetween(groupId: number | null, today: string, until: string): number {
  if (until <= today) return 0;
  return groupSessionDates(groupId, today, 200).filter((d) => d < until).length;
}

/** Şu an (İstanbul): gün ve "SS:DD". */
export function clockNow(now: Date = new Date()): { day: string; time: string } {
  const local = isoToIstanbulLocal(now.toISOString());
  return { day: local.slice(0, 10), time: local.slice(11, 16) };
}

/** Grubun `day` günündeki, `time` saatine kadar biten antrenman sayısı: o antrenmanların hakkı düşmüştür. */
export function finishedOn(groupId: number | null, day: string, time: string): number {
  if (!groupId) return 0;
  return getDb()
    .select({ id: trainingSessions.id })
    .from(trainingSessions)
    .where(and(eq(trainingSessions.groupId, groupId), eq(trainingSessions.date, day), eq(trainingSessions.status, "scheduled"), lte(trainingSessions.endTime, time)))
    .all().length;
}

/**
 * `from` gününden itibaren henüz yapılmamış ilk `count` antrenman günü: `from` bugünse saati geçmiş (bitmiş)
 * antrenmanlar düşülür. Elle hak girişi "kaç antrenman kaldı"yı buna göre sayar.
 */
export function upcomingSessionDates(groupId: number | null, from: string, count: number, now: Date = new Date()): string[] {
  const clock = clockNow(now);
  const skip = from === clock.day ? finishedOn(groupId, clock.day, clock.time) : 0;
  return groupSessionDates(groupId, from, count + skip).slice(skip);
}

/** Grubun `day` gününde antrenmanı var ve hepsi `time` saatine kadar bitti. */
export function trainingsOver(groupId: number | null, day: string, time: string): boolean {
  if (!groupId) return false;
  const todays = getDb()
    .select({ endTime: trainingSessions.endTime })
    .from(trainingSessions)
    .where(and(eq(trainingSessions.groupId, groupId), eq(trainingSessions.date, day), eq(trainingSessions.status, "scheduled")))
    .all();
  return todays.length > 0 && todays.every((s) => s.endTime <= time);
}

/**
 * Hakların başlayacağı gün: `day` bugünse ve grubun bugünkü antrenmanları bitmişse (kayıt ya da ödeme antrenmandan
 * sonra yapıldıysa) ertesi gün. Öğrenci katılamadığı antrenmanın hakkını kaybetmez.
 */
export function rightsStartDay(groupId: number | null, day: string, now: Date = new Date()): string {
  const clock = clockNow(now);
  return day === clock.day && trainingsOver(groupId, day, clock.time) ? addDaysTo(day, 1) : day;
}

