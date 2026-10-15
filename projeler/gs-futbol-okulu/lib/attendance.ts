import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { attendance, registrations, trainingSessions, type Attendance } from "@/lib/db/schema";
import { accessMap, todayKey } from "@/lib/billing";
import type { AccessState } from "@/lib/billing-shared";
import { isoToIstanbulLocal } from "@/lib/format";
import { getSession, type SessionView } from "@/lib/program";
import { hasPhotoConsentMap } from "@/lib/legal";

export class AttendanceError extends Error {}

export const ATTENDANCE_STATUSES = ["present", "absent", "excused"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export type RosterRow = {
  id: number;
  name: string;
  studentNo: number | null;
  photoFileId: number | null;
  isGoalkeeper: boolean;
  access: AccessState;
  allowed: boolean;
  status: AttendanceStatus | null;
  source: string | null;
};

/** Seansın öğrenci listesi: grubun kayıtlı öğrencileri + (grup değiştirmiş olsa da) bu seansta yoklaması olanlar. */
export function sessionRoster(sessionId: number, today: string = todayKey()): { session: SessionView; rows: RosterRow[] } {
  const session = getSession(sessionId);
  if (!session) throw new AttendanceError("Seans bulunamadı.");
  const db = getDb();
  const marks = db.select().from(attendance).where(eq(attendance.sessionId, sessionId)).all();
  const markedIds = marks.map((m) => m.registrationId);
  const students = db
    .select({ id: registrations.id, name: registrations.studentFullName, studentNo: registrations.studentNo, photoFileId: registrations.photoFileId, status: registrations.status, groupId: registrations.groupId, isGoalkeeper: registrations.isGoalkeeper })
    .from(registrations)
    .where(eq(registrations.status, "enrolled"))
    .all()
    .filter((r) => r.groupId === session.groupId || markedIds.includes(r.id));
  const extra = markedIds.filter((id) => !students.some((s) => s.id === id));
  if (extra.length)
    students.push(
      ...db
        .select({ id: registrations.id, name: registrations.studentFullName, studentNo: registrations.studentNo, photoFileId: registrations.photoFileId, status: registrations.status, groupId: registrations.groupId, isGoalkeeper: registrations.isGoalkeeper })
        .from(registrations)
        .where(inArray(registrations.id, extra))
        .all(),
    );
  const access = accessMap(students, today);
  const consent = hasPhotoConsentMap(students.map((s) => s.id));
  const byReg = new Map(marks.map((m) => [m.registrationId, m]));
  const rows = students
    .map((s) => {
      const a = access.get(s.id)!;
      const m = byReg.get(s.id);
      return {
        id: s.id,
        name: s.name,
        studentNo: s.studentNo,
        photoFileId: consent.get(s.id) ? s.photoFileId : null,
        isGoalkeeper: s.isGoalkeeper,
        access: a.state,
        allowed: a.allowed,
        status: (m?.status as AttendanceStatus | undefined) ?? null,
        source: m?.source ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return { session, rows };
}

/**
 * Yoklama işaretler. Kartla okutmada "Geldi" yalnız erişim hakkı olan öğrenciye yazılır (ödeme = antrenman hakkı);
 * elle yoklamada sahaya gelen her öğrenci "Geldi" yazılır, aidat durumu listede ayrıca görünür.
 * Geçmiş seans için de düzeltme yapılabilir; gelecekteki seansa yoklama yazılamaz.
 */
export function markAttendance(input: { sessionId: number; registrationId: number; status: AttendanceStatus; source: "qr" | "manual"; userId: number | null }, today: string = todayKey()): Attendance {
  const db = getDb();
  const session = getSession(input.sessionId);
  if (!session) throw new AttendanceError("Seans bulunamadı.");
  if (session.status !== "scheduled") throw new AttendanceError("Bu seans iptal edilmiş.");
  if (session.date > today) throw new AttendanceError("Gelecekteki bir seansa yoklama yazılamaz.");
  const reg = db.select({ id: registrations.id, status: registrations.status }).from(registrations).where(eq(registrations.id, input.registrationId)).get();
  if (!reg) throw new AttendanceError("Öğrenci bulunamadı.");
  if (input.status === "present" && input.source === "qr") {
    const a = accessMap([reg], today).get(reg.id)!;
    if (!a.allowed) throw new AttendanceError(a.state === "inactive" ? "Öğrenci aktif değil." : "Aidat ödenmemiş; öğrenci antrenmana alınamaz.");
  }
  const now = new Date().toISOString();
  return db
    .insert(attendance)
    .values({ sessionId: input.sessionId, registrationId: input.registrationId, status: input.status, source: input.source, markedBy: input.userId, markedAt: now })
    .onConflictDoUpdate({ target: [attendance.sessionId, attendance.registrationId], set: { status: input.status, source: input.source, markedBy: input.userId, markedAt: now } })
    .returning()
    .get();
}

export function clearAttendance(sessionId: number, registrationId: number): void {
  getDb()
    .delete(attendance)
    .where(and(eq(attendance.sessionId, sessionId), eq(attendance.registrationId, registrationId)))
    .run();
}

/** Velinin panelden "gelemeyecek" bildirdiği kayıtların kaynağı. */
export const GUARDIAN_SOURCE = "guardian";

/**
 * Veli "gelemeyecek" bildirir: bugünkü ya da gelecekteki antrenmana "izinli" yazılır (devam oranını düşürmez,
 * devamsızlık serisine girmez). Geri alınabilir; antrenörün yazdığı yoklamaya dokunulmaz.
 */
export function guardianExcuse(input: { registrationId: number; sessionId: number; userId: number; on: boolean }, today: string = todayKey()): SessionView {
  const db = getDb();
  const session = getSession(input.sessionId);
  if (!session) throw new AttendanceError("Antrenman bulunamadı.");
  const reg = db.select({ id: registrations.id, groupId: registrations.groupId, status: registrations.status }).from(registrations).where(eq(registrations.id, input.registrationId)).get();
  if (!reg || reg.status !== "enrolled" || reg.groupId !== session.groupId) throw new AttendanceError("Bu antrenman öğrencinin grubuna ait değil.");
  if (session.status !== "scheduled") throw new AttendanceError("Bu antrenman iptal edildi.");
  if (session.date < today) throw new AttendanceError("Geçmiş antrenman için bildirim yapılamaz.");
  const where = and(eq(attendance.sessionId, session.id), eq(attendance.registrationId, reg.id));
  const existing = db.select().from(attendance).where(where).get();
  if (input.on) {
    if (existing?.status === "present") throw new AttendanceError("Yoklamada “geldi” olarak işaretli.");
    if (existing) return session; // antrenör zaten işaretlemiş
    db.insert(attendance).values({ sessionId: session.id, registrationId: reg.id, status: "excused", source: GUARDIAN_SOURCE, markedBy: input.userId, markedAt: new Date().toISOString() }).run();
  } else if (existing?.source === GUARDIAN_SOURCE) {
    db.delete(attendance).where(where).run();
  }
  return session;
}

/** Öğrencinin, verilen seanslar arasında velinin "gelemeyecek" bildirdikleri. */
export function guardianExcusedSessions(registrationId: number, sessionIds: number[]): Set<number> {
  if (sessionIds.length === 0) return new Set();
  const rows = getDb()
    .select({ sessionId: attendance.sessionId })
    .from(attendance)
    .where(and(eq(attendance.registrationId, registrationId), inArray(attendance.sessionId, sessionIds), eq(attendance.source, GUARDIAN_SOURCE)))
    .all();
  return new Set(rows.map((r) => r.sessionId));
}

/** Seanstaki işaretlenmemiş öğrencileri toplu işaretler ("kalanlar gelmedi", kağıttan girerken "hepsi geldi"). */
export function markRest(sessionId: number, status: AttendanceStatus, userId: number | null): number {
  const { rows } = sessionRoster(sessionId);
  let n = 0;
  getDb().transaction(() => {
    for (const r of rows)
      if (!r.status) {
        markAttendance({ sessionId, registrationId: r.id, status, source: "manual", userId });
        n++;
      }
  });
  return n;
}

/** Yoklamayı kapat: işaretlenmemişler "gelmedi". */
export function markRestAbsent(sessionId: number, userId: number | null): number {
  return markRest(sessionId, "absent", userId);
}

/** Şu an (ya da yakın) süren seans: başlangıçtan 45 dk önce ile bitişten 30 dk sonrası arası. */
export function currentSession(sessions: SessionView[], now: Date = new Date()): SessionView | null {
  const local = isoToIstanbulLocal(now.toISOString()); // YYYY-MM-DDTHH:MM
  const day = local.slice(0, 10);
  const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const nowMin = minutes(local.slice(11, 16));
  const candidates = sessions.filter((s) => s.date === day && s.status === "scheduled" && nowMin >= minutes(s.startTime) - 45 && nowMin <= minutes(s.endTime) + 30);
  return candidates.sort((a, b) => Math.abs(minutes(a.startTime) - nowMin) - Math.abs(minutes(b.startTime) - nowMin))[0] ?? null;
}

/* ---------------- Özetler ---------------- */

export type AttendanceSummary = { present: number; absent: number; excused: number; rate: number | null; streak: number; absentStreak: number };

/** Öğrencinin bugüne kadarki yoklama kayıtları (en yeni önce). */
export function studentAttendance(registrationId: number, limit = 60): (Attendance & { date: string; startTime: string; groupId: number })[] {
  return getDb()
    .select({ a: attendance, date: trainingSessions.date, startTime: trainingSessions.startTime, groupId: trainingSessions.groupId })
    .from(attendance)
    .innerJoin(trainingSessions, eq(attendance.sessionId, trainingSessions.id))
    .where(and(eq(attendance.registrationId, registrationId), lte(trainingSessions.date, todayKey())))
    .orderBy(desc(trainingSessions.date), desc(trainingSessions.startTime))
    .limit(limit)
    .all()
    .map((r) => ({ ...r.a, date: r.date, startTime: r.startTime, groupId: r.groupId }));
}

export function summarize(records: { status: string }[]): AttendanceSummary {
  let present = 0;
  let absent = 0;
  let excused = 0;
  for (const r of records) {
    if (r.status === "present") present++;
    else if (r.status === "absent") absent++;
    else if (r.status === "excused") excused++;
  }
  // Seriler en yeni kayıttan geriye sayılır; izinli seriyi bozmaz.
  let streak = 0;
  for (const r of records) {
    if (r.status === "present") streak++;
    else if (r.status === "absent") break;
  }
  let absentStreak = 0;
  for (const r of records) {
    if (r.status === "absent") absentStreak++;
    else if (r.status === "present") break;
  }
  return { present, absent, excused, rate: present + absent > 0 ? Math.round((present / (present + absent)) * 100) : null, streak, absentStreak };
}

/** Birden çok öğrenci için özet (rapor ve listeler). */
export function attendanceSummaries(ids: number[], from?: string, to?: string): Map<number, AttendanceSummary> {
  const out = new Map<number, AttendanceSummary>();
  if (ids.length === 0) return out;
  const conds = [inArray(attendance.registrationId, ids), lte(trainingSessions.date, to ?? todayKey())];
  if (from) conds.push(gte(trainingSessions.date, from));
  const rows = getDb()
    .select({ reg: attendance.registrationId, status: attendance.status, date: trainingSessions.date })
    .from(attendance)
    .innerJoin(trainingSessions, eq(attendance.sessionId, trainingSessions.id))
    .where(and(...conds))
    .orderBy(desc(trainingSessions.date), desc(trainingSessions.startTime))
    .all();
  const grouped = new Map<number, { status: string }[]>();
  for (const r of rows) grouped.set(r.reg, [...(grouped.get(r.reg) ?? []), r]);
  for (const id of ids) out.set(id, summarize(grouped.get(id) ?? []));
  return out;
}

/** Seanslardaki yoklama sayıları (takvim / rapor). */
export function sessionCounts(sessionIds: number[]): Map<number, { present: number; absent: number; excused: number }> {
  const out = new Map<number, { present: number; absent: number; excused: number }>();
  if (sessionIds.length === 0) return out;
  const rows = getDb().select({ s: attendance.sessionId, status: attendance.status }).from(attendance).where(inArray(attendance.sessionId, sessionIds)).orderBy(asc(attendance.id)).all();
  for (const r of rows) {
    const c = out.get(r.s) ?? { present: 0, absent: 0, excused: 0 };
    if (r.status === "present" || r.status === "absent" || r.status === "excused") c[r.status]++;
    out.set(r.s, c);
  }
  return out;
}
