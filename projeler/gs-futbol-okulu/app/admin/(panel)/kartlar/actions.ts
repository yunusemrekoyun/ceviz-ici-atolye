"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { idSchema, runAdmin, UserError, type ActionResult } from "@/lib/admin-action";
import { CardError, issueCard, markPrinted } from "@/lib/cards";
import { getDb } from "@/lib/db";
import { registrations } from "@/lib/db/schema";
import { deleteFile, FileRejectedError, fileToBuffer, saveUpload } from "@/lib/files";
import { hasPhotoConsent } from "@/lib/legal";
import { getRegistration } from "@/lib/registrations";

const run = (scope: string, fn: Parameters<typeof runAdmin>[2]) => runAdmin("kayit.duzenle", scope, fn, [CardError, FileRejectedError]);

export async function uploadPhotoAction(registrationId: number, form: FormData): Promise<ActionResult> {
  if (!idSchema.safeParse(registrationId).success) return { ok: false, error: "Geçersiz kayıt." };
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Fotoğraf seçin." };
  return run("upload photo", async (actor) => {
    const reg = getRegistration(registrationId);
    if (!reg) throw new UserError("Kayıt bulunamadı.");
    if (!hasPhotoConsent(registrationId)) throw new UserError("Fotoğraf izni yok. Önce öğrencinin Onaylar bölümünden fotoğraf iznini işleyin.");
    const stored = await saveUpload(await fileToBuffer(file), "photo", { registrationId, userId: actor.id });
    const old = reg.photoFileId;
    getDb().update(registrations).set({ photoFileId: stored.id, updatedAt: new Date().toISOString() }).where(eq(registrations.id, registrationId)).run();
    if (old) deleteFile(old);
    return { action: "kart.foto", entity: "registration", entityId: registrationId, summary: `${reg.studentFullName}: fotoğraf yüklendi` };
  });
}

export async function removePhotoAction(registrationId: number): Promise<ActionResult> {
  if (!idSchema.safeParse(registrationId).success) return { ok: false, error: "Geçersiz kayıt." };
  return run("remove photo", () => {
    const reg = getRegistration(registrationId);
    if (!reg?.photoFileId) throw new UserError("Fotoğraf yok.");
    getDb().update(registrations).set({ photoFileId: null, updatedAt: new Date().toISOString() }).where(eq(registrations.id, registrationId)).run();
    deleteFile(reg.photoFileId);
    return { action: "kart.foto-sil", entity: "registration", entityId: registrationId, summary: `${reg.studentFullName}: fotoğraf silindi` };
  });
}

export async function reissueCardAction(registrationId: number, reason: string): Promise<ActionResult> {
  if (!idSchema.safeParse(registrationId).success) return { ok: false, error: "Geçersiz kayıt." };
  const r = z.string().trim().max(200).safeParse(reason);
  if (!r.success) return { ok: false, error: "Gerekçe çok uzun." };
  return run("reissue card", (actor) => {
    const reg = getRegistration(registrationId);
    if (!reg || reg.status !== "enrolled") throw new UserError("Yalnız kayıtlı öğrenciye kart verilir.");
    const card = issueCard(registrationId, actor.id, r.data || "Yeni kart basıldı");
    return { action: "kart.yeni", entity: "registration", entityId: registrationId, summary: `${reg.studentFullName}: yeni kart ${card.code}${r.data ? ` (${r.data})` : ""}; eski kart iptal` };
  });
}

export async function markPrintedAction(cardIds: number[]): Promise<ActionResult> {
  if (!z.array(idSchema).max(500).safeParse(cardIds).success) return { ok: false, error: "Geçersiz istek." };
  return run("mark printed", () => {
    markPrinted(cardIds);
    return { action: "kart.bas", entity: "card", summary: `${cardIds.length} kart basıldı` };
  });
}
