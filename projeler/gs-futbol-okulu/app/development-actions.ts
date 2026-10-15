"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { logServerError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { getCurrentUser, getRequestMeta } from "@/lib/auth/server";
import type { SessionUser } from "@/lib/auth/sessions";
import { getDb } from "@/lib/db";
import { evaluations, measurements, registrations, testResults } from "@/lib/db/schema";
import { deleteEvaluation, recordMeasurement, saveEvaluation, saveTestResults, scoresSchema, setSessionDrills, testsForGroup } from "@/lib/development";
import { getSession, saveSessionLog } from "@/lib/program";
import { groupScope, inScope } from "@/lib/scan";
import { getSettings } from "@/lib/settings";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const DENIED = { ok: false as const, error: "Bu işlem için yetkiniz yok." };
const id = z.number().int().positive();
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Gelişim girişi: yönetici ya da antrenör, gelisim.gir izni, yalnız kendi grupları. */
async function staff(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  if (!user || (user.portal !== "admin" && user.portal !== "coach") || !user.permissions.includes("gelisim.gir")) return null;
  return user;
}

function groupStudents(groupId: number) {
  return getDb()
    .select({ id: registrations.id, name: registrations.studentFullName, studentNo: registrations.studentNo })
    .from(registrations)
    .where(and(eq(registrations.groupId, groupId), eq(registrations.status, "enrolled")))
    .all()
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

async function audit(user: SessionUser, action: string, summary: string) {
  writeAudit({ id: user.id, fullName: user.fullName, username: user.username, ip: (await getRequestMeta()).ip }, { action, entity: "development", summary });
}

export type EntryRow = { id: number; name: string; studentNo: number | null; a: number | null; b: number | null; evaluatedToday: boolean };

/** Grup listesi + seçili gün için mevcut değerler (ölçüm: a=boy, b=kilo; test: a=değer). */
export async function entryRosterAction(groupId: number, mode: "measure" | "test" | "evaluate", date: string, testId: number | null): Promise<Result<{ rows: EntryRow[]; tests: { id: number; name: string; unit: string; decimals: number }[]; criteria: string[] }>> {
  const user = await staff();
  if (!user || !id.safeParse(groupId).success || !day.safeParse(date).success || !inScope(groupScope(user), groupId)) return DENIED;
  const students = groupStudents(groupId);
  const ids = students.map((s) => s.id);
  const db = getDb();
  const ms = mode === "measure" && ids.length ? db.select().from(measurements).where(and(inArray(measurements.registrationId, ids), eq(measurements.measuredOn, date))).all() : [];
  const trs = mode === "test" && testId && ids.length ? db.select().from(testResults).where(and(inArray(testResults.registrationId, ids), eq(testResults.testId, testId), eq(testResults.testedOn, date))).all() : [];
  const evs = mode === "evaluate" && ids.length ? db.select({ r: evaluations.registrationId }).from(evaluations).where(and(inArray(evaluations.registrationId, ids), eq(evaluations.evaluatedOn, date))).all() : [];
  const rows = students.map((s) => {
    const m = ms.find((x) => x.registrationId === s.id);
    const t = trs.find((x) => x.registrationId === s.id);
    return { ...s, a: m?.heightCm ?? t?.value ?? null, b: m?.weightKg ?? null, evaluatedToday: evs.some((e) => e.r === s.id) };
  });
  const tests = testsForGroup(groupId).map((t) => ({ id: t.id, name: t.name, unit: t.unit, decimals: t.decimals }));
  return { ok: true, rows, tests, criteria: getSettings().evaluationCriteria };
}

const num = (min: number, max: number) => z.number().min(min).max(max).nullable();

export async function saveMeasurementsAction(groupId: number, date: string, rows: { id: number; height: number | null; weight: number | null }[]): Promise<Result<{ count: number }>> {
  const user = await staff();
  if (!user || !id.safeParse(groupId).success || !day.safeParse(date).success || !inScope(groupScope(user), groupId)) return DENIED;
  const parsed = z.array(z.object({ id, height: num(60, 230), weight: num(10, 160) })).max(200).safeParse(rows);
  if (!parsed.success) return { ok: false, error: "Boy 60–230 cm, kilo 10–160 kg arasında olmalı." };
  const allowed = new Set(groupStudents(groupId).map((s) => s.id));
  let count = 0;
  try {
    for (const r of parsed.data) {
      if (!allowed.has(r.id) || (r.height === null && r.weight === null)) continue;
      recordMeasurement({ registrationId: r.id, measuredOn: date, heightCm: r.height, weightKg: r.weight === null ? null : Math.round(r.weight * 10) / 10, userId: user.id });
      count++;
    }
  } catch (err) {
    logServerError("save measurements", err);
    return { ok: false, error: "Kaydedilemedi." };
  }
  await audit(user, "gelisim.olcum", `Grup #${groupId} ${date}: ${count} ölçüm`);
  revalidatePath("/", "layout");
  return { ok: true, count };
}

export async function saveTestResultsAction(groupId: number, testId: number, date: string, rows: { id: number; value: number | null }[]): Promise<Result<{ count: number }>> {
  const user = await staff();
  if (!user || !id.safeParse(groupId).success || !id.safeParse(testId).success || !day.safeParse(date).success || !inScope(groupScope(user), groupId)) return DENIED;
  if (!testsForGroup(groupId).some((t) => t.id === testId)) return { ok: false, error: "Bu test bu grup için tanımlı değil." };
  const parsed = z.array(z.object({ id, value: z.number().finite().min(-100000).max(100000).nullable() })).max(200).safeParse(rows);
  if (!parsed.success) return { ok: false, error: "Geçersiz değer." };
  const allowed = new Set(groupStudents(groupId).map((s) => s.id));
  const count = saveTestResults(testId, date, parsed.data.filter((r) => allowed.has(r.id)).map((r) => ({ registrationId: r.id, value: r.value })), user.id);
  await audit(user, "gelisim.test", `Grup #${groupId} test #${testId} ${date}: ${count} sonuç`);
  revalidatePath("/", "layout");
  return { ok: true, count };
}

export async function saveEvaluationAction(registrationId: number, date: string, scores: Record<string, number>, comment: string): Promise<Result> {
  const user = await staff();
  if (!user || !id.safeParse(registrationId).success || !day.safeParse(date).success) return DENIED;
  const reg = getDb().select({ groupId: registrations.groupId }).from(registrations).where(eq(registrations.id, registrationId)).get();
  if (!reg || !inScope(groupScope(user), reg.groupId)) return DENIED;
  const criteria = getSettings().evaluationCriteria;
  const parsed = scoresSchema.safeParse(scores);
  if (!parsed.success || Object.keys(parsed.data).some((k) => !criteria.includes(k))) return { ok: false, error: "Geçersiz puan." };
  if (Object.keys(parsed.data).length === 0) return { ok: false, error: "En az bir kritere puan verin." };
  saveEvaluation({ registrationId, evaluatedOn: date, scores: parsed.data, comment: comment.trim().slice(0, 1000) || null, userId: user.id });
  await audit(user, "gelisim.degerlendirme", `Öğrenci #${registrationId} değerlendirildi (${date})`);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteEvaluationAction(evaluationId: number): Promise<Result> {
  const user = await staff();
  if (!user || !id.safeParse(evaluationId).success) return DENIED;
  const ev = getDb().select({ reg: evaluations.registrationId }).from(evaluations).where(eq(evaluations.id, evaluationId)).get();
  const reg = ev ? getDb().select({ groupId: registrations.groupId }).from(registrations).where(eq(registrations.id, ev.reg)).get() : null;
  if (!reg || !inScope(groupScope(user), reg.groupId)) return DENIED;
  deleteEvaluation(evaluationId);
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Antrenman günlüğü: not + kullanılan drill'ler (ATK-01). */
export async function sessionJournalAction(sessionId: number, text: string, drillIds: number[]): Promise<Result> {
  const user = await staff();
  if (!user || !id.safeParse(sessionId).success || !z.array(id).max(30).safeParse(drillIds).success) return DENIED;
  const s = getSession(sessionId);
  if (!s || !inScope(groupScope(user), s.groupId)) return DENIED;
  saveSessionLog(sessionId, String(text ?? "").trim().slice(0, 2000) || null, user.id);
  setSessionDrills(sessionId, drillIds);
  revalidatePath("/", "layout");
  return { ok: true };
}
