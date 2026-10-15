import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { jobRuns, registrations } from "@/lib/db/schema";
import { accessMap, ensureAllPeriods, invalidatePeriodCache, todayKey } from "@/lib/billing";
import { dayLabel, formatMoney, type Access } from "@/lib/billing-shared";
import { diffDays } from "@/lib/dates";
import { purgeExpiredSessions } from "@/lib/auth/sessions";
import { notify } from "@/lib/notifications";
import { attendanceSummaries } from "@/lib/attendance";
import { notifyGuardiansOfStudent } from "@/lib/guardian-notify";
import { ensureSessionsWindow } from "@/lib/program";
import { getSettings } from "@/lib/settings";

export type DailyTask = { name: string; run: (today: string) => string | void };

/** Diğer modüller günlük işe buradan görev ekler (yoklama, devamsızlık, veli hatırlatmaları). */
const extraTasks: DailyTask[] = [];
export function registerDailyTask(task: DailyTask): void {
  if (!extraTasks.some((t) => t.name === task.name)) extraTasks.push(task);
}

function billingTask(today: string): string {
  const created = ensureAllPeriods(today);
  invalidatePeriodCache();
  const enrolled = getDb().select({ id: registrations.id, status: registrations.status, name: registrations.studentFullName }).from(registrations).where(eq(registrations.status, "enrolled")).all();
  const map = accessMap(enrolled, today);
  let locked = 0;
  let grace = 0;
  let promiseToday = 0;
  let due = 0;
  for (const r of enrolled) {
    const a = map.get(r.id)!;
    if (a.state === "override" && a.override?.endsOn === today) promiseToday++;
    if (a.state === "grace") {
      grace++;
      due += a.amountDueKurus;
    }
    if (a.state === "locked") {
      locked++;
      due += a.amountDueKurus;
      // Kilidin ilk günü: admine tek tek bildirim (aynı dönem için bir kez).
      if (a.dueDate) {
        const key = `kilit:${r.id}:${a.dueDate}${a.promiseMissed ? `:soz:${a.promiseMissed}` : ""}`;
        notify({ permission: "aidat.gor", kind: "aidat.kilit", title: `${r.name}: ${a.promiseMissed ? "ödeme sözü tutulmadı" : a.firstPack ? "ilk aidatı gelmedi" : "antrenman hakkı bitti"}`, body: `Aidat bekleniyor (${formatMoney(a.amountDueKurus)}).`, link: `/admin/aidat?ogrenci=${r.id}`, dedupeKey: key });
      }
    }
  }
  guardianReminders(enrolled, map, today);
  if (locked || grace || promiseToday)
    notify({
      permission: "aidat.gor",
      kind: "aidat.ozet",
      title: "Günlük aidat özeti",
      body: `${locked} öğrencinin antrenman hakkı yok, ${grace} öğrencinin aidatı bekleniyor${promiseToday ? `, ${promiseToday} öğrenci bugün ödeyecek (söz)` : ""} · toplam ${formatMoney(due)}.`,
      link: "/admin/aidat",
      dedupeKey: `aidat-ozet:${today}`,
    });
  return `${created} hak paketi açıldı, ${grace} aidat bekleniyor, ${locked} hakkı yok`;
}

/** Veliye aidat hatırlatmaları: yenileme gününden önce, yenileme günü gelince ve hak bitince (her biri bir kez). */
function guardianReminders(enrolled: { id: number; name: string }[], map: Map<number, Access>, today: string): void {
  const before = getSettings().reminderDaysBefore;
  for (const r of enrolled) {
    const a = map.get(r.id);
    if (!a) continue;
    const first = r.name.split(" ")[0];
    if (a.state === "paid" && a.paidUntil && before > 0 && diffDays(a.paidUntil, today) === before)
      notifyGuardiansOfStudent(r.id, { kind: "aidat.yaklasiyor", title: "Antrenman hakkı yenilenecek", body: `${first} için 8 antrenmanlık hakkın yenileme günü ${dayLabel(a.paidUntil)}.`, link: "/veli", dedupeKey: `aidat-yaklasiyor:${r.id}:${a.paidUntil}` });
    // İlk aidat: ilk antrenman günü gelmeden veliye hatırlatma gitmez (kayıtta ödemesi girilmemiş olabilir).
    if (a.state === "grace" && a.dueDate && (!a.firstPack || a.dueDate <= today))
      notifyGuardiansOfStudent(r.id, {
        kind: "aidat.gunu",
        title: a.firstPack ? "Aidat bekleniyor" : "Antrenman hakkı yenileme günü",
        body: `${first} için ${a.firstPack ? "8 antrenmanlık hak aidatla başlar" : "aidat"}: ${formatMoney(a.amountDueKurus)}. Son gün ${dayLabel(a.lastDay ?? today)}.`,
        link: "/veli",
        dedupeKey: `aidat-gunu:${r.id}:${a.dueDate}`,
      });
    if (a.state === "locked" && a.dueDate)
      notifyGuardiansOfStudent(r.id, { kind: "aidat.kilit", title: a.firstPack ? "Aidat bekleniyor" : "Antrenman hakkı bitti", body: `${first} aidat alınana kadar antrenmanlara katılamıyor.`, link: "/veli", dedupeKey: `aidat-kilit-veli:${r.id}:${a.dueDate}` });
  }
}

function programTask(): string {
  ensureSessionsWindow(true);
  return "seanslar hazır";
}

/** Üst üste N antrenmana gelmeyen öğrenci için yönetime ve veliye haber (YOK-05). */
function absenceTask(today: string): string {
  const threshold = getSettings().absenceAlertCount;
  const enrolled = getDb().select({ id: registrations.id, name: registrations.studentFullName }).from(registrations).where(eq(registrations.status, "enrolled")).all();
  const sums = attendanceSummaries(enrolled.map((r) => r.id));
  let n = 0;
  for (const r of enrolled) {
    const s = sums.get(r.id);
    if (!s || s.absentStreak < threshold) continue;
    // Seri aynı kaldıkça tekrar bildirilmez; seri büyüdükçe eşik katlarında yeniden haber verilir.
    const step = Math.floor(s.absentStreak / threshold) * threshold;
    notify({ permission: "kayit.gor", kind: "devamsizlik", title: `${r.name} üst üste ${s.absentStreak} antrenmana gelmedi`, body: "Veliyle iletişime geçmek isteyebilirsiniz.", link: `/admin/kayit/${r.id}`, dedupeKey: `devamsizlik:${r.id}:${step}` });
    notifyGuardiansOfStudent(r.id, { kind: "devamsizlik", title: `${r.name} son ${s.absentStreak} antrenmana katılmadı`, body: "Bir sorun varsa bize haber verin; birlikte çözelim.", link: "/veli", dedupeKey: `devamsizlik-veli:${r.id}:${step}` });
    n++;
  }
  void today;
  return `${n} devamsızlık uyarısı`;
}

function sessionsTask(): string {
  purgeExpiredSessions(new Date());
  return "oturumlar temizlendi";
}

/**
 * Günlük iş: aynı gün ikinci kez tetiklenirse çalışmaz (run_key = gün).
 * `force` yalnız elle yeniden denemek için; başarısız bir çalışmanın yerine yenisini yazar.
 */
export function runDaily(now: Date = new Date(), force = false): { ran: boolean; status: string; detail: string } {
  const db = getDb();
  const today = todayKey(now);
  const existing = db.select().from(jobRuns).where(and(eq(jobRuns.job, "daily"), eq(jobRuns.runKey, today))).get();
  if (existing && !(force || existing.status === "failed")) return { ran: false, status: existing.status, detail: existing.detail ?? "" };
  if (existing) db.delete(jobRuns).where(eq(jobRuns.id, existing.id)).run();
  try {
    db.insert(jobRuns).values({ job: "daily", runKey: today, status: "running", startedAt: now.toISOString() }).run();
  } catch {
    return { ran: false, status: "running", detail: "başka bir çalışma sürüyor" };
  }
  const results: string[] = [];
  let failed = false;
  const builtIn: DailyTask[] = [
    { name: "aidat", run: billingTask },
    { name: "program", run: programTask },
    { name: "devamsizlik", run: absenceTask },
    { name: "oturum", run: sessionsTask },
  ];
  for (const task of [...builtIn, ...extraTasks]) {
    try {
      const r = task.run(today);
      if (r) results.push(`${task.name}: ${r}`);
    } catch (err) {
      failed = true;
      results.push(`${task.name}: HATA ${err instanceof Error ? err.message : String(err)}`);
      console.error(`[cron] ${task.name} başarısız:`, err);
    }
  }
  const detail = results.join(" · ").slice(0, 1000);
  const status = failed ? "failed" : "ok";
  db.update(jobRuns).set({ status, detail, finishedAt: new Date().toISOString() }).where(and(eq(jobRuns.job, "daily"), eq(jobRuns.runKey, today))).run();
  return { ran: true, status, detail };
}
