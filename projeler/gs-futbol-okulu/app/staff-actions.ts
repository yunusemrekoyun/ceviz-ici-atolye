"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logServerError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { getCurrentUser, getRequestMeta } from "@/lib/auth/server";
import type { SessionUser } from "@/lib/auth/sessions";
import { ATTENDANCE_STATUSES, AttendanceError, clearAttendance, markAttendance, markRest, markRestAbsent, sessionRoster, type RosterRow } from "@/lib/attendance";
import { isAttendanceGridCell } from "@/lib/attendance-grid";
import { todayKey } from "@/lib/billing";
import { getSession } from "@/lib/program";
import { groupScope, inScope, scan, type ScanResult } from "@/lib/scan";

/**
 * Sahada kullanılan işlemler (yönetici ve antrenör ortak). Yetki: oturum + yoklama.al izni + grup kapsamı.
 * Kapsam kontrolü burada, veriye dokunmadan önce yapılır.
 */
async function staff(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user || (user.portal !== "admin" && user.portal !== "coach")) return null;
  if (!user.permissions.includes("yoklama.al")) return null;
  return user;
}

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const DENIED = { ok: false as const, error: "Bu işlem için yetkiniz yok." };
const id = z.number().int().positive();

function sessionAllowed(user: SessionUser, sessionId: number): boolean {
  const s = getSession(sessionId);
  return Boolean(s && inScope(groupScope(user), s.groupId));
}

function refresh(): void {
  revalidatePath("/admin/yoklama");
  revalidatePath("/antrenor", "layout");
}

export async function scanAction(input: string, sessionId: number | null): Promise<Result<{ result: ScanResult }>> {
  const user = await staff();
  if (!user) return DENIED;
  if (typeof input !== "string" || input.length > 300) return { ok: false, error: "Geçersiz giriş." };
  if (sessionId !== null && (!id.safeParse(sessionId).success || !sessionAllowed(user, sessionId))) return DENIED;
  try {
    const result = scan(input, user, { sessionId });
    if (result.outcome === "marked") refresh();
    return { ok: true, result };
  } catch (err) {
    logServerError("scan", err);
    return { ok: false, error: "Okutma sırasında hata oluştu." };
  }
}

export async function rosterAction(sessionId: number): Promise<Result<{ rows: RosterRow[] }>> {
  const user = await staff();
  if (!user || !id.safeParse(sessionId).success || !sessionAllowed(user, sessionId)) return DENIED;
  return { ok: true, rows: sessionRoster(sessionId).rows };
}

/** `quiet`: yoklama tablosu kendi ekranını kendisi günceller; her dokunuşta sayfa yeniden çizilmez. */
export async function markAction(sessionId: number, registrationId: number, status: string | null, quiet = false): Promise<Result> {
  const user = await staff();
  if (!user || !id.safeParse(sessionId).success || !id.safeParse(registrationId).success || !sessionAllowed(user, sessionId)) return DENIED;
  try {
    const roster = sessionRoster(sessionId).rows;
    // Çizelge, birleşen eski grubun geçmişini öğrencinin yeni grup satırına taşır.
    // Henüz yoklama girilmemiş bu hücreler şimdiki grup üyeliğinden oluşan listede bulunmaz.
    if (!roster.some((r) => r.id === registrationId) && !isAttendanceGridCell(sessionId, registrationId, { scope: groupScope(user), today: todayKey() })) {
      return { ok: false, error: "Öğrenci bu seansın listesinde değil." };
    }
    if (status === null) clearAttendance(sessionId, registrationId);
    else {
      const parsed = z.enum(ATTENDANCE_STATUSES).safeParse(status);
      if (!parsed.success) return { ok: false, error: "Geçersiz durum." };
      markAttendance({ sessionId, registrationId, status: parsed.data, source: "manual", userId: user.id });
    }
  } catch (err) {
    if (err instanceof AttendanceError) return { ok: false, error: err.message };
    logServerError("mark attendance", err);
    return { ok: false, error: "Kaydedilemedi." };
  }
  if (quiet !== true) refresh();
  return { ok: true };
}

/** Yoklama tablosunda bir günün işaretlenmemiş öğrencilerine toplu "Geldi" ya da "Gelmedi" (kağıttan girerken). */
export async function fillRestAction(sessionId: number, status: "present" | "absent"): Promise<Result<{ count: number }>> {
  const user = await staff();
  if (!user || !id.safeParse(sessionId).success || !sessionAllowed(user, sessionId)) return DENIED;
  if (status !== "present" && status !== "absent") return { ok: false, error: "Geçersiz durum." };
  try {
    const count = markRest(sessionId, status, user.id);
    const s = getSession(sessionId);
    writeAudit(
      { id: user.id, fullName: user.fullName, username: user.username, ip: (await getRequestMeta()).ip },
      { action: "yoklama.toplu", entity: "session", entityId: sessionId, summary: `${s?.groupName ?? ""} ${s?.date ?? ""}: işaretsiz ${count} öğrenci ${status === "present" ? "geldi" : "gelmedi"}` },
    );
    refresh();
    return { ok: true, count };
  } catch (err) {
    if (err instanceof AttendanceError) return { ok: false, error: err.message };
    logServerError("fill roll", err);
    return { ok: false, error: "Kaydedilemedi." };
  }
}

export async function closeRollAction(sessionId: number): Promise<Result<{ count: number }>> {
  const user = await staff();
  if (!user || !id.safeParse(sessionId).success || !sessionAllowed(user, sessionId)) return DENIED;
  try {
    const count = markRestAbsent(sessionId, user.id);
    const s = getSession(sessionId);
    writeAudit(
      { id: user.id, fullName: user.fullName, username: user.username, ip: (await getRequestMeta()).ip },
      { action: "yoklama.kapat", entity: "session", entityId: sessionId, summary: `${s?.groupName ?? ""} ${s?.date ?? ""} yoklaması kapatıldı (${count} gelmedi)` },
    );
    refresh();
    return { ok: true, count };
  } catch (err) {
    if (err instanceof AttendanceError) return { ok: false, error: err.message };
    logServerError("close roll", err);
    return { ok: false, error: "Kaydedilemedi." };
  }
}
