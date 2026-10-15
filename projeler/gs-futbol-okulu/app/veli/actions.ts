"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logServerError } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { getCurrentUser, getRequestMeta } from "@/lib/auth/server";
import { AttendanceError, guardianExcuse } from "@/lib/attendance";
import { accessOf, BillingError, createClaim } from "@/lib/billing";
import { formatMoney, PAYMENT_METHODS } from "@/lib/billing-shared";
import { FileRejectedError, fileToBuffer, saveUpload } from "@/lib/files";
import { guardianCanSee } from "@/lib/guardians";
import { getVersion, LegalTextError, recordConsent } from "@/lib/legal";
import { markRead, notify } from "@/lib/notifications";
import { savePendingSubmission } from "@/lib/merge";
import { getRegistration } from "@/lib/registrations";
import { coerceFormValues, validateRegistration, type FieldErrors } from "@/lib/validation";

type Result = { ok: true } | { ok: false; error: string };

async function guardian() {
  const user = await getCurrentUser();
  return user?.portal === "guardian" ? user : null;
}

const answersSchema = z
  .array(z.object({ registrationId: z.number().int().positive(), versionId: z.number().int().positive(), accepted: z.boolean() }))
  .min(1)
  .max(60);

/** Onay ekranı: her çocuk için her metnin sürümüne verilen yanıt kaydedilir. */
export async function saveConsentsAction(answers: { registrationId: number; versionId: number; accepted: boolean }[]): Promise<Result> {
  const user = await guardian();
  if (!user) return { ok: false, error: "Oturumunuz kapanmış. Tekrar giriş yapın." };
  const parsed = answersSchema.safeParse(answers);
  if (!parsed.success) return { ok: false, error: "Geçersiz istek." };
  const ip = (await getRequestMeta()).ip;
  try {
    for (const a of parsed.data) {
      if (!guardianCanSee(user.id, a.registrationId)) return { ok: false, error: "Geçersiz istek." };
      const v = getVersion(a.versionId);
      if (!v) return { ok: false, error: "Metin bulunamadı." };
      recordConsent({ userId: user.id, registrationId: a.registrationId, versionId: a.versionId, accepted: a.accepted, method: "panel", ip });
    }
  } catch (err) {
    if (err instanceof LegalTextError) return { ok: false, error: err.message };
    logServerError("save consents", err);
    return { ok: false, error: "Kaydedilemedi." };
  }
  revalidatePath("/veli", "layout");
  return { ok: true };
}

/** "Ödeme yaptım": dekont (isteğe bağlı) ile bildirim. Erişim admin onaylayınca açılır. */
export async function paymentClaimAction(registrationId: number, form: FormData): Promise<Result> {
  const user = await guardian();
  if (!user) return { ok: false, error: "Oturumunuz kapanmış. Tekrar giriş yapın." };
  if (!Number.isInteger(registrationId) || !guardianCanSee(user.id, registrationId)) return { ok: false, error: "Geçersiz istek." };
  const method = z.enum(PAYMENT_METHODS).safeParse(form.get("method"));
  if (!method.success) return { ok: false, error: "Ödemeyi nasıl yaptığınızı seçin." };
  const note = String(form.get("note") ?? "").trim().slice(0, 300) || null;
  const file = form.get("receipt");
  try {
    let fileId: number | null = null;
    if (file instanceof File && file.size > 0) fileId = (await saveUpload(await fileToBuffer(file), "receipt", { registrationId, userId: user.id })).id;
    createClaim({ registrationId, userId: user.id, method: method.data, fileId, note });
    const reg = getRegistration(registrationId);
    const access = reg ? accessOf(reg) : null;
    notify({
      permission: "aidat.al",
      kind: "aidat.bildirim",
      title: `Ödeme bildirimi: ${reg?.studentFullName ?? ""}`,
      body: `${method.data === "eft" ? "Havale/EFT" : "Nakit"}${fileId ? ", dekont eklendi" : ""}${access?.amountDueKurus ? ` · borç ${formatMoney(access.amountDueKurus)}` : ""}`,
      link: "/admin/aidat?sekme=onay",
    });
    writeAudit({ id: user.id, fullName: user.fullName, username: user.username, ip: (await getRequestMeta()).ip }, { action: "veli.odeme-bildirimi", entity: "registration", entityId: registrationId, summary: `${reg?.studentFullName ?? ""}: veli ödeme bildirdi (${method.data})` });
  } catch (err) {
    if (err instanceof BillingError || err instanceof FileRejectedError) return { ok: false, error: err.message };
    logServerError("payment claim", err);
    return { ok: false, error: "Gönderilemedi. Lütfen tekrar deneyin." };
  }
  revalidatePath("/veli", "layout");
  return { ok: true };
}

export async function markNotificationsReadAction(): Promise<void> {
  const user = await guardian();
  if (user) markRead(user);
}

/** "Gelemeyecek": sıradaki antrenmana izinli yazılır (antrenör yoklamada görür); `on: false` geri alır. */
export async function excuseAction(registrationId: number, sessionId: number, on: boolean): Promise<Result> {
  const user = await guardian();
  if (!user) return { ok: false, error: "Oturumunuz kapanmış. Tekrar giriş yapın." };
  if (!Number.isInteger(registrationId) || !Number.isInteger(sessionId) || typeof on !== "boolean" || !guardianCanSee(user.id, registrationId)) return { ok: false, error: "Geçersiz istek." };
  try {
    const session = guardianExcuse({ registrationId, sessionId, userId: user.id, on });
    const reg = getRegistration(registrationId);
    writeAudit(
      { id: user.id, fullName: user.fullName, username: user.username, ip: (await getRequestMeta()).ip },
      { action: on ? "veli.gelemeyecek" : "veli.gelemeyecek-geri", entity: "registration", entityId: registrationId, summary: `${reg?.studentFullName ?? ""}: ${session.date} ${session.startTime} antrenmanı için ${on ? "gelemeyecek bildirildi" : "bildirim geri alındı"}` },
    );
  } catch (err) {
    if (err instanceof AttendanceError) return { ok: false, error: err.message };
    logServerError("guardian excuse", err);
    return { ok: false, error: "Kaydedilemedi." };
  }
  revalidatePath("/veli", "layout");
  return { ok: true };
}

/**
 * Veli eksik ya da hatalı bilgileri tamamlar: kayıt doğrudan değişmez, panelde "Veliden güncel bilgi geldi" olarak
 * okulun onayına düşer (ön kayıt formunun yeniden gönderilmesiyle aynı yol).
 */
export async function submitInfoAction(registrationId: number, payload: unknown): Promise<Result | { ok: false; error: string; errors: FieldErrors }> {
  const user = await guardian();
  if (!user) return { ok: false, error: "Oturumunuz kapanmış. Tekrar giriş yapın." };
  if (!Number.isInteger(registrationId) || !guardianCanSee(user.id, registrationId)) return { ok: false, error: "Geçersiz istek." };
  const values = coerceFormValues(payload);
  const result = validateRegistration(values);
  if (!result.success) return { ok: false, error: result.formError ?? "Lütfen işaretli alanları düzeltin.", errors: result.errors };
  try {
    const reg = getRegistration(registrationId);
    savePendingSubmission(registrationId, values);
    notify({ permission: "kayit.duzenle", kind: "kayit.guncelleme", title: "Veliden güncel bilgi geldi", body: reg?.studentFullName ?? "", link: `/admin/kayit/${registrationId}` });
    writeAudit(
      { id: user.id, fullName: user.fullName, username: user.username, ip: (await getRequestMeta()).ip },
      { action: "veli.bilgi-guncelleme", entity: "registration", entityId: registrationId, summary: `${reg?.studentFullName ?? ""}: veli panelden bilgileri gönderdi (onay bekliyor)` },
    );
  } catch (err) {
    logServerError("guardian info", err);
    return { ok: false, error: "Gönderilemedi. Lütfen tekrar deneyin." };
  }
  revalidatePath("/veli", "layout");
  return { ok: true };
}
