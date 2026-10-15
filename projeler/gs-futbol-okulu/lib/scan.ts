import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { ageGroups, attendance, registrations, scanEvents, type Registration } from "@/lib/db/schema";
import type { SessionUser } from "@/lib/auth/sessions";
import { accessOf, todayKey } from "@/lib/billing";
import type { AccessState } from "@/lib/billing-shared";
import { cardByCode, CARD_CODE_PATTERN } from "@/lib/cards";
import { AttendanceError, currentSession, markAttendance } from "@/lib/attendance";
import { hasPhotoConsent } from "@/lib/legal";
import { notify } from "@/lib/notifications";
import { getSession, groupIdsOfCoach, sessionsOn, type SessionView } from "@/lib/program";
import { getRegistrationByStudentNo } from "@/lib/registrations";
import { resolveContactParent } from "@/lib/format";

/** Kullanıcının görebildiği gruplar; null = tümü. Kontrol veri katmanında yapılır (GUV-07). */
export function groupScope(user: Pick<SessionUser, "id" | "portal" | "permissions">): number[] | null {
  if (user.permissions.includes("tum.gruplar")) return null;
  if (user.portal === "admin" && user.permissions.includes("kayit.gor")) return null;
  return groupIdsOfCoach(user.id);
}

export function inScope(scope: number[] | null, groupId: number | null): boolean {
  return scope === null || (groupId !== null && scope.includes(groupId));
}

/** Antrenör / sahada görünüm: TC, adres, aidat tutarı yok. */
export type FieldStudent = {
  id: number;
  name: string;
  studentNo: number | null;
  groupId: number | null;
  groupName: string | null;
  photoFileId: number | null;
  birthDate: string;
  bloodGroup: string;
  contactName: string;
  contactPhone: string;
  emergencyName: string;
  emergencyRelation: string;
  emergencyPhone: string;
  access: AccessState;
  allowed: boolean;
};

export function fieldStudent(reg: Registration, today: string = todayKey()): FieldStudent {
  const group = reg.groupId ? getDb().select({ name: ageGroups.name }).from(ageGroups).where(eq(ageGroups.id, reg.groupId)).get() : null;
  const a = accessOf(reg, today);
  const contact = resolveContactParent(reg);
  return {
    id: reg.id,
    name: reg.studentFullName,
    studentNo: reg.studentNo,
    groupId: reg.groupId,
    groupName: group?.name ?? null,
    photoFileId: reg.photoFileId && hasPhotoConsent(reg.id) ? reg.photoFileId : null,
    birthDate: reg.birthDate,
    bloodGroup: reg.bloodGroup,
    contactName: contact.fullName,
    contactPhone: contact.phone,
    emergencyName: reg.emergencyFullName,
    emergencyRelation: reg.emergencyRelation,
    emergencyPhone: reg.emergencyPhone,
    access: a.state,
    allowed: a.allowed,
  };
}

export type ScanOutcome = "marked" | "already" | "no_session" | "locked" | "revoked" | "inactive" | "unknown" | "not_allowed" | "viewed";

export type ScanResult = {
  outcome: ScanOutcome;
  message: string;
  student: FieldStudent | null;
  session: Pick<SessionView, "id" | "groupName" | "startTime" | "endTime"> | null;
};

/** Okutulan metin: kart adresi (…/k/KOD), çıplak kart kodu ya da öğrenci numarası. */
export function parseScanInput(raw: string): { code: string } | { studentNo: number } | null {
  const text = raw.trim();
  const fromUrl = /\/k\/([2-9A-Za-z]{8})(?:[/?#]|$)/.exec(text)?.[1];
  const code = (fromUrl ?? text).toUpperCase();
  if (CARD_CODE_PATTERN.test(code)) return { code };
  if (/^\d{3,7}$/.test(text)) return { studentNo: Number(text) };
  return null;
}

function logScan(input: string, user: SessionUser, result: ScanOutcome, registrationId: number | null, cardId: number | null, sessionId: number | null): void {
  try {
    getDb().insert(scanEvents).values({ input: input.slice(0, 200), registrationId, cardId, userId: user.id, sessionId, result }).run();
  } catch (err) {
    console.error("[scan] kayıt yazılamadı:", err instanceof Error ? err.message : err);
  }
}

/**
 * Kart okutma / numara girişi. Hakkı olan öğrenci için o anki seansına "geldi" yazılır.
 * `sessionId` verilirse (yoklama ekranından okutma) o seans kullanılır.
 */
export function scan(raw: string, user: SessionUser, options: { sessionId?: number | null; mark?: boolean } = {}, now: Date = new Date()): ScanResult {
  const today = todayKey(now);
  const parsed = parseScanInput(raw);
  const none = { student: null, session: null };
  if (!parsed) {
    logScan(raw, user, "unknown", null, null, null);
    return { outcome: "unknown", message: "Kart tanınmadı. Öğrenci numarasını elle yazabilirsiniz.", ...none };
  }
  let reg: Registration | null = null;
  let cardId: number | null = null;
  if ("code" in parsed) {
    const card = cardByCode(parsed.code);
    if (!card) {
      logScan(raw, user, "unknown", null, null, null);
      return { outcome: "unknown", message: "Bu kart sistemde yok.", ...none };
    }
    cardId = card.id;
    reg = getDb().select().from(registrations).where(eq(registrations.id, card.registrationId)).get() ?? null;
    if (card.status !== "active") {
      logScan(raw, user, "revoked", reg?.id ?? null, card.id, null);
      return { outcome: "revoked", message: "Bu kart iptal edilmiş (kayıp ya da yenilendi). Öğrencinin yeni kartını ya da numarasını kullanın.", ...none };
    }
  } else {
    reg = getRegistrationByStudentNo(parsed.studentNo);
  }
  if (!reg) {
    logScan(raw, user, "unknown", null, cardId, null);
    return { outcome: "unknown", message: "Öğrenci bulunamadı.", ...none };
  }
  const scope = groupScope(user);
  if (!inScope(scope, reg.groupId)) {
    logScan(raw, user, "not_allowed", reg.id, cardId, null);
    return { outcome: "not_allowed", message: "Bu öğrenci sizin gruplarınızda değil.", ...none };
  }
  const student = fieldStudent(reg, today);
  if (reg.status !== "enrolled") {
    logScan(raw, user, "inactive", reg.id, cardId, null);
    return { outcome: "inactive", message: "Öğrencinin kaydı aktif değil.", student, session: null };
  }
  if (!student.allowed) {
    logScan(raw, user, "locked", reg.id, cardId, options.sessionId ?? null);
    notify({
      permission: "aidat.gor",
      kind: "aidat.kilitli-okutma",
      title: `${reg.studentFullName} kilitliyken okutuldu`,
      body: "Aidatı ödenmeden antrenmana getirilmiş. Veliyle iletişime geçin.",
      link: `/admin/aidat?ogrenci=${reg.id}`,
      dedupeKey: `kilitli-okutma:${reg.id}:${today}`,
    });
    return { outcome: "locked", message: "Aidat ödenmemiş. Öğrenci antrenmana alınamaz.", student, session: null };
  }
  if (options.mark === false) {
    logScan(raw, user, "viewed", reg.id, cardId, null);
    return { outcome: "viewed", message: "Hakkı var.", student, session: null };
  }
  const session = options.sessionId ? getSession(options.sessionId) : currentSession(sessionsOn(today, reg.groupId ? [reg.groupId] : []), now);
  if (!session || session.date !== today || !inScope(scope, session.groupId)) {
    logScan(raw, user, "no_session", reg.id, cardId, null);
    return { outcome: "no_session", message: "Hakkı var. Şu an bu öğrencinin grubuna ait bir antrenman yok.", student, session: null };
  }
  const sessionInfo = { id: session.id, groupName: session.groupName, startTime: session.startTime, endTime: session.endTime };
  try {
    const existing = sessionAlreadyPresent(session.id, reg.id);
    if (existing) {
      logScan(raw, user, "already", reg.id, cardId, session.id);
      return { outcome: "already", message: "Zaten “geldi” olarak işaretli.", student, session: sessionInfo };
    }
    markAttendance({ sessionId: session.id, registrationId: reg.id, status: "present", source: "qr", userId: user.id }, today);
  } catch (err) {
    if (err instanceof AttendanceError) return { outcome: "no_session", message: err.message, student, session: sessionInfo };
    throw err;
  }
  logScan(raw, user, "marked", reg.id, cardId, session.id);
  return { outcome: "marked", message: "Geldi olarak işaretlendi.", student, session: sessionInfo };
}

function sessionAlreadyPresent(sessionId: number, registrationId: number): boolean {
  const row = getDb()
    .select({ status: attendance.status })
    .from(attendance)
    .where(and(eq(attendance.sessionId, sessionId), eq(attendance.registrationId, registrationId)))
    .get();
  return row?.status === "present";
}
