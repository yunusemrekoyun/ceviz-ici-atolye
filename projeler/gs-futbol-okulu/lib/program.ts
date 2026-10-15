import { and, asc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import {
  ageGroups,
  attendance,
  groupCoaches,
  groupSchedules,
  trainingSessions,
  users,
  venues,
  type GroupSchedule,
  type TrainingSession,
  type Venue,
} from "@/lib/db/schema";
import { addDaysTo, parseDay } from "@/lib/dates";
import { invalidatePeriodCache, todayKey } from "@/lib/billing";

export class ProgramError extends Error {}

export const WEEKDAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"] as const;
/** Kısa gün adları ("Cuma" ile "Cumartesi" ilk üç harfle karışmasın diye ayrı). */
export const WEEKDAYS_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;

/** "YYYY-MM-DD" → 1 (Pazartesi) … 7 (Pazar) */
export function weekdayOf(day: string): number {
  const { y, m, d } = parseDay(day);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return js === 0 ? 7 : js;
}

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Saat SS:DD biçiminde olmalı." });
const optionalDay = z
  .string()
  .trim()
  .transform((v) => v || null)
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable());

/* ---------------- Sahalar ---------------- */

export const venueSchema = z.object({
  name: z.string().trim().min(2, { error: "Saha adını girin." }).max(80),
  address: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v || null),
  location: z
    .string()
    .trim()
    .max(300)
    .transform((v, ctx) => {
      if (!v) return null;
      const c = parseLocation(v);
      if (!c) {
        ctx.addIssue({ code: "custom", message: "Konum okunamadı. Koordinatı “39.42, 29.98” biçiminde girin (kısa paylaşım bağlantıları konum içermez)." });
        return z.NEVER;
      }
      return c;
    }),
  note: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v || null),
});

/** "39.42, 29.98" ya da içinde koordinat geçen harita bağlantısından enlem/boylam çıkarır. */
export function parseLocation(input: string): { lat: number; lng: number } | null {
  const patterns = [/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/, /[?&](?:q|query|ll|destination|daddr)=(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, /^\s*(-?\d{1,2}\.\d+)\s*[, ]\s*(-?\d{1,3}\.\d+)\s*$/];
  for (const p of patterns) {
    const m = p.exec(input);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}

export function listVenues(includeInactive = false): Venue[] {
  const q = getDb().select().from(venues);
  return (includeInactive ? q : q.where(eq(venues.active, true))).orderBy(asc(venues.name)).all();
}

export function saveVenue(id: number | null, input: z.infer<typeof venueSchema>): Venue {
  const values = { name: input.name, address: input.address, note: input.note, lat: input.location?.lat ?? null, lng: input.location?.lng ?? null };
  const db = getDb();
  if (id === null) return db.insert(venues).values(values).returning().get();
  const row = db.update(venues).set(values).where(eq(venues.id, id)).returning().get();
  if (!row) throw new ProgramError("Saha bulunamadı.");
  return row;
}

export function setVenueActive(id: number, active: boolean): Venue {
  const row = getDb().update(venues).set({ active }).where(eq(venues.id, id)).returning().get();
  if (!row) throw new ProgramError("Saha bulunamadı.");
  return row;
}

/* ---------------- Haftalık program ---------------- */

export const scheduleSchema = z
  .object({
    groupId: z.coerce.number().int().positive({ error: "Grup seçin." }),
    weekday: z.coerce.number().int().min(1, { error: "Gün seçin." }).max(7),
    startTime: time,
    endTime: time,
    venueId: z.coerce
      .number()
      .int()
      .nonnegative()
      .transform((v) => v || null),
    validFrom: optionalDay,
    validTo: optionalDay,
  })
  .refine((v) => v.endTime > v.startTime, { error: "Bitiş saati başlangıçtan sonra olmalı.", path: ["endTime"] })
  .refine((v) => !v.validFrom || !v.validTo || v.validTo >= v.validFrom, { error: "Bitiş tarihi başlangıçtan önce olamaz.", path: ["validTo"] });

export type ScheduleInput = z.infer<typeof scheduleSchema>;

export function listSchedules(): GroupSchedule[] {
  return getDb().select().from(groupSchedules).orderBy(asc(groupSchedules.groupId), asc(groupSchedules.weekday), asc(groupSchedules.startTime)).all();
}

/**
 * Program değişince bugünden sonraki, taşınmamış ve yoklaması alınmamış seanslar güncellenir;
 * artık programa uymayanlar silinir, yenileri bir sonraki üretimde oluşur.
 */
function refreshFutureSessions(scheduleId: number, today: string): void {
  const db = getDb();
  const schedule = db.select().from(groupSchedules).where(eq(groupSchedules.id, scheduleId)).get();
  const future = db
    .select({ id: trainingSessions.id, originalDate: trainingSessions.originalDate, moved: trainingSessions.moved, status: trainingSessions.status })
    .from(trainingSessions)
    .where(and(eq(trainingSessions.scheduleId, scheduleId), gte(trainingSessions.date, today)))
    .all();
  const withAttendance = new Set(
    future.length
      ? db
          .selectDistinct({ id: attendance.sessionId })
          .from(attendance)
          .where(inArray(attendance.sessionId, future.map((f) => f.id)))
          .all()
          .map((r) => r.id)
      : [],
  );
  for (const s of future) {
    if (s.moved || withAttendance.has(s.id)) continue;
    const fits = schedule && s.originalDate && weekdayOf(s.originalDate) === schedule.weekday && (!schedule.validFrom || s.originalDate >= schedule.validFrom) && (!schedule.validTo || s.originalDate <= schedule.validTo);
    if (!fits) db.delete(trainingSessions).where(eq(trainingSessions.id, s.id)).run();
    else if (s.status === "scheduled") db.update(trainingSessions).set({ startTime: schedule.startTime, endTime: schedule.endTime, venueId: schedule.venueId, groupId: schedule.groupId }).where(eq(trainingSessions.id, s.id)).run();
  }
}

export function saveSchedule(id: number | null, input: ScheduleInput): GroupSchedule {
  invalidatePeriodCache(); // hak paketlerinin tarihleri programa bağlı
  const db = getDb();
  return db.transaction(() => {
    const row =
      id === null
        ? db.insert(groupSchedules).values(input).returning().get()
        : db.update(groupSchedules).set(input).where(eq(groupSchedules.id, id)).returning().get();
    if (!row) throw new ProgramError("Program satırı bulunamadı.");
    if (id !== null) refreshFutureSessions(id, todayKey());
    return row;
  });
}

export function deleteSchedule(id: number): void {
  invalidatePeriodCache(); // hak paketlerinin tarihleri programa bağlı
  const db = getDb();
  db.transaction(() => {
    const today = todayKey();
    // Geçmiş seanslar (yoklamasıyla) kalır; gelecektekiler silinir.
    const future = db.select({ id: trainingSessions.id }).from(trainingSessions).where(and(eq(trainingSessions.scheduleId, id), gte(trainingSessions.date, today))).all();
    const ids = future.map((f) => f.id);
    if (ids.length) {
      const used = new Set(db.selectDistinct({ id: attendance.sessionId }).from(attendance).where(inArray(attendance.sessionId, ids)).all().map((r) => r.id));
      const removable = ids.filter((x) => !used.has(x));
      if (removable.length) db.delete(trainingSessions).where(inArray(trainingSessions.id, removable)).run();
    }
    db.delete(groupSchedules).where(eq(groupSchedules.id, id)).run();
  });
}

/* ---------------- Antrenör ataması ---------------- */

export function listGroupCoaches(): { groupId: number; userId: number; name: string }[] {
  return getDb()
    .select({ groupId: groupCoaches.groupId, userId: groupCoaches.userId, name: sql<string>`coalesce(${users.fullName}, ${users.username})` })
    .from(groupCoaches)
    .innerJoin(users, eq(groupCoaches.userId, users.id))
    .all();
}

export function setGroupCoaches(groupId: number, userIds: number[]): void {
  const db = getDb();
  db.transaction(() => {
    if (!db.select({ id: ageGroups.id }).from(ageGroups).where(and(eq(ageGroups.id, groupId), isNull(ageGroups.archivedAt))).get()) throw new ProgramError("Grup bulunamadı.");
    db.delete(groupCoaches).where(eq(groupCoaches.groupId, groupId)).run();
    const unique = [...new Set(userIds)];
    if (unique.length) db.insert(groupCoaches).values(unique.map((userId) => ({ groupId, userId }))).run();
  });
}

export function groupIdsOfCoach(userId: number): number[] {
  return getDb().select({ id: groupCoaches.groupId }).from(groupCoaches).where(eq(groupCoaches.userId, userId)).all().map((r) => r.id);
}

/* ---------------- Seanslar ---------------- */

/** Programdan [from, to] aralığındaki seansları üretir (idempotent). */
export function ensureSessions(from: string, to: string): number {
  const db = getDb();
  const schedules = listSchedules();
  let created = 0;
  db.transaction(() => {
    for (let day = from; day <= to; day = addDaysTo(day, 1)) {
      const wd = weekdayOf(day);
      for (const s of schedules) {
        if (s.weekday !== wd) continue;
        if (s.validFrom && day < s.validFrom) continue;
        if (s.validTo && day > s.validTo) continue;
        const row = db
          .insert(trainingSessions)
          .values({ groupId: s.groupId, scheduleId: s.id, originalDate: day, date: day, startTime: s.startTime, endTime: s.endTime, venueId: s.venueId })
          .onConflictDoNothing()
          .returning({ id: trainingSessions.id })
          .get();
        if (row) created++;
      }
    }
  });
  return created;
}

const globalForProgram = globalThis as unknown as { __gsSessionsEnsured?: string };

/** Gün içinde bir kez: geçen haftadan 5 hafta sonrasına kadar seanslar hazır olur. */
export function ensureSessionsWindow(force = false): void {
  const today = todayKey();
  if (!force && globalForProgram.__gsSessionsEnsured === today) return;
  ensureSessions(addDaysTo(today, -7), addDaysTo(today, 35));
  globalForProgram.__gsSessionsEnsured = today;
}

export function invalidateSessionWindow(): void {
  globalForProgram.__gsSessionsEnsured = undefined;
}

export type SessionView = TrainingSession & { groupName: string; venueName: string | null; venue: Venue | null };

export function listSessions(options: { from: string; to: string; groupIds?: number[] | null; includeCancelled?: boolean }): SessionView[] {
  const db = getDb();
  const conds = [gte(trainingSessions.date, options.from), lte(trainingSessions.date, options.to)];
  if (options.groupIds) {
    if (options.groupIds.length === 0) return [];
    conds.push(inArray(trainingSessions.groupId, options.groupIds));
  }
  if (!options.includeCancelled) conds.push(eq(trainingSessions.status, "scheduled"));
  const rows = db
    .select({ s: trainingSessions, groupName: ageGroups.name, venue: venues })
    .from(trainingSessions)
    .innerJoin(ageGroups, eq(trainingSessions.groupId, ageGroups.id))
    .leftJoin(venues, eq(trainingSessions.venueId, venues.id))
    .where(and(...conds))
    .orderBy(asc(trainingSessions.date), asc(trainingSessions.startTime))
    .all();
  return rows.map((r) => ({ ...r.s, groupName: r.groupName, venueName: r.venue?.name ?? null, venue: r.venue }));
}

export function getSession(id: number): SessionView | null {
  const r = getDb()
    .select({ s: trainingSessions, groupName: ageGroups.name, venue: venues })
    .from(trainingSessions)
    .innerJoin(ageGroups, eq(trainingSessions.groupId, ageGroups.id))
    .leftJoin(venues, eq(trainingSessions.venueId, venues.id))
    .where(eq(trainingSessions.id, id))
    .get();
  return r ? { ...r.s, groupName: r.groupName, venueName: r.venue?.name ?? null, venue: r.venue } : null;
}

export function cancelSession(id: number, reason: string): TrainingSession {
  invalidatePeriodCache(); // hak paketlerinin tarihleri programa bağlı
  const row = getDb().update(trainingSessions).set({ status: "cancelled", cancelReason: reason }).where(eq(trainingSessions.id, id)).returning().get();
  if (!row) throw new ProgramError("Seans bulunamadı.");
  return row;
}

export function restoreSession(id: number): TrainingSession {
  invalidatePeriodCache(); // hak paketlerinin tarihleri programa bağlı
  const row = getDb().update(trainingSessions).set({ status: "scheduled", cancelReason: null }).where(eq(trainingSessions.id, id)).returning().get();
  if (!row) throw new ProgramError("Seans bulunamadı.");
  return row;
}

export const moveSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Tarih seçin." }),
    startTime: time,
    endTime: time,
    venueId: z.coerce
      .number()
      .int()
      .nonnegative()
      .transform((v) => v || null),
  })
  .refine((v) => v.endTime > v.startTime, { error: "Bitiş saati başlangıçtan sonra olmalı.", path: ["endTime"] });

export function moveSession(id: number, input: z.infer<typeof moveSchema>): TrainingSession {
  invalidatePeriodCache(); // hak paketlerinin tarihleri programa bağlı
  const row = getDb()
    .update(trainingSessions)
    .set({ ...input, moved: true, status: "scheduled", cancelReason: null })
    .where(eq(trainingSessions.id, id))
    .returning()
    .get();
  if (!row) throw new ProgramError("Seans bulunamadı.");
  return row;
}

export function createExtraSession(groupId: number, input: z.infer<typeof moveSchema>): TrainingSession {
  invalidatePeriodCache(); // hak paketlerinin tarihleri programa bağlı
  return getDb()
    .insert(trainingSessions)
    .values({ groupId, ...input, moved: false })
    .returning()
    .get();
}

export function saveSessionLog(id: number, text: string | null, userId: number): void {
  const row = getDb()
    .update(trainingSessions)
    .set({ logText: text, logBy: userId, logAt: new Date().toISOString() })
    .where(eq(trainingSessions.id, id))
    .returning({ id: trainingSessions.id })
    .get();
  if (!row) throw new ProgramError("Seans bulunamadı.");
}

/** Grubun bugünkü seansları (yoklama için). */
export function sessionsOn(day: string, groupIds?: number[] | null): SessionView[] {
  return listSessions({ from: day, to: day, groupIds });
}

/** Yaklaşan (bugün dahil) seanslar; aktif program yoksa boş. */
export function upcomingForGroups(groupIds: number[], days = 14): SessionView[] {
  const today = todayKey();
  return listSessions({ from: today, to: addDaysTo(today, days), groupIds, includeCancelled: true });
}

export function schedulesForGroups(groupIds: number[]): (GroupSchedule & { venue: Venue | null })[] {
  if (groupIds.length === 0) return [];
  const today = todayKey();
  return getDb()
    .select({ s: groupSchedules, v: venues })
    .from(groupSchedules)
    .leftJoin(venues, eq(groupSchedules.venueId, venues.id))
    .where(and(inArray(groupSchedules.groupId, groupIds), or(isNull(groupSchedules.validTo), gte(groupSchedules.validTo, today))))
    .orderBy(asc(groupSchedules.weekday), asc(groupSchedules.startTime))
    .all()
    .map((r) => ({ ...r.s, venue: r.v }));
}
