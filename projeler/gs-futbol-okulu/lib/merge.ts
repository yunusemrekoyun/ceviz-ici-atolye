import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { feePeriods, payments, registrations, registrationSubmissions, type Registration } from "@/lib/db/schema";
import { getRegistration, RegistrationNotFoundError, updateRegistrationAdmin } from "@/lib/registrations";
import type { AdminRegistrationInput, RegistrationFormValues } from "@/lib/validation";
import { coerceFormValues } from "@/lib/validation";

export class MergeError extends Error {}

/* ---------------- Veliden gelen güncel bilgi (aynı T.C.) ---------------- */

export function savePendingSubmission(registrationId: number, values: RegistrationFormValues): void {
  const db = getDb();
  // Aynı kayıt için bekleyen eski gönderim varsa en yenisi geçerli olur.
  db.update(registrationSubmissions)
    .set({ status: "dismissed", decidedAt: new Date().toISOString() })
    .where(and(eq(registrationSubmissions.registrationId, registrationId), eq(registrationSubmissions.status, "pending")))
    .run();
  db.insert(registrationSubmissions).values({ registrationId, payload: JSON.stringify(values) }).run();
}

export type PendingSubmission = { id: number; createdAt: string; values: RegistrationFormValues };

export function pendingSubmissions(): Map<number, PendingSubmission> {
  const rows = getDb().select().from(registrationSubmissions).where(eq(registrationSubmissions.status, "pending")).orderBy(desc(registrationSubmissions.id)).all();
  const out = new Map<number, PendingSubmission>();
  for (const r of rows) {
    if (out.has(r.registrationId)) continue;
    let values: RegistrationFormValues;
    try {
      values = coerceFormValues(JSON.parse(r.payload));
    } catch {
      continue;
    }
    out.set(r.registrationId, { id: r.id, createdAt: r.createdAt, values });
  }
  return out;
}

export function countPendingSubmissions(): number {
  return pendingSubmissions().size;
}

function decide(id: number, status: "applied" | "dismissed", userId: number): number {
  const row = getDb()
    .update(registrationSubmissions)
    .set({ status, decidedBy: userId, decidedAt: new Date().toISOString() })
    .where(and(eq(registrationSubmissions.id, id), eq(registrationSubmissions.status, "pending")))
    .returning({ registrationId: registrationSubmissions.registrationId })
    .get();
  if (!row) throw new MergeError("Bu güncelleme zaten sonuçlandırılmış.");
  return row.registrationId;
}

export function applySubmission(submissionId: number, data: AdminRegistrationInput, userId: number): Registration {
  return getDb().transaction(() => {
    const registrationId = decide(submissionId, "applied", userId);
    return updateRegistrationAdmin(registrationId, data);
  });
}

export function dismissSubmission(submissionId: number, userId: number): number {
  return decide(submissionId, "dismissed", userId);
}

/* ---------------- İki kaydı birleştirme ---------------- */

const STAGE: Record<string, number> = { enrolled: 5, left: 4, scheduled: 3, no_show: 2, pending: 1, cancelled: 0 };

/** Hangi kaydın kalacağı önerisi: süreçte daha ileride olan, eşitse daha eski olan. */
export function preferredKeep(a: Registration, b: Registration): Registration {
  const sa = STAGE[a.status] ?? 0;
  const sb = STAGE[b.status] ?? 0;
  if (sa !== sb) return sa > sb ? a : b;
  return a.createdAt <= b.createdAt ? a : b;
}

/**
 * Birleştirme: seçilen alan değerleri kalan kayda yazılır, notlar eklenir, diğer kayıt silinir.
 * Silinecek kayıt asıl kayıtlıysa ya da aidat hareketi varsa izin verilmez (o kayıt tutulmalı).
 */
export function mergeRegistrations(keepId: number, dropId: number, data: AdminRegistrationInput): Registration {
  if (keepId === dropId) throw new MergeError("Aynı kayıt seçildi.");
  const db = getDb();
  return db.transaction(() => {
    const keep = getRegistration(keepId);
    const drop = getRegistration(dropId);
    if (!keep || !drop) throw new RegistrationNotFoundError();
    if (drop.status === "enrolled" || drop.status === "left") throw new MergeError("Silinecek kayıt asıl kayıtlı; onu tutun, diğerini silin.");
    const hasMoney = db.select({ id: payments.id }).from(payments).where(eq(payments.registrationId, dropId)).get() || db.select({ id: feePeriods.id }).from(feePeriods).where(eq(feePeriods.registrationId, dropId)).get();
    if (hasMoney) throw new MergeError("Silinecek kaydın aidat hareketi var; birleştirilemez.");
    // TC benzersiz: önce silinecek kayıttan kaldırılır ki kalan kayda yazılabilsin.
    db.update(registrations).set({ studentTc: null }).where(eq(registrations.id, dropId)).run();
    const note = [keep.adminNote, drop.adminNote ? `[Birleştirilen kayıttan] ${drop.adminNote}` : null].filter(Boolean).join("\n") || null;
    const updated = updateRegistrationAdmin(keepId, data);
    db.update(registrations)
      .set({ adminNote: note, groupId: keep.groupId ?? drop.groupId, appointmentAt: keep.appointmentAt ?? drop.appointmentAt })
      .where(eq(registrations.id, keepId))
      .run();
    db.delete(registrations).where(eq(registrations.id, dropId)).run();
    return { ...updated, adminNote: note };
  });
}

export function markNotDuplicate(aId: number, bId: number): void {
  const db = getDb();
  for (const [x, y] of [
    [aId, bId],
    [bId, aId],
  ] as const) {
    const r = getRegistration(x);
    if (!r) throw new RegistrationNotFoundError();
    let list: number[] = [];
    try {
      list = JSON.parse(r.notDuplicateOf ?? "[]");
    } catch {
      list = [];
    }
    if (!list.includes(y)) list.push(y);
    db.update(registrations).set({ notDuplicateOf: JSON.stringify(list) }).where(eq(registrations.id, x)).run();
  }
}
