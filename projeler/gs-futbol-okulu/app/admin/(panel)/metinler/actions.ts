"use server";

import { z } from "zod";
import { idSchema, invalid, runAdmin, type ActionResult } from "@/lib/admin-action";
import { getRequestMeta, requireAdmin } from "@/lib/auth/server";
import { CONSENT_TYPES, LegalTextError, consentStatesForRegistration, createLegalText, discardDraft, getVersion, publishDraft, recordConsent, saveDraft, updateLegalTextMeta } from "@/lib/legal";
import { getRegistration } from "@/lib/registrations";

const keySchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60);
const metaSchema = z.object({
  title: z.string().trim().min(2, { error: "Başlık girin." }).max(120),
  description: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v || null),
  consentType: z.enum(CONSENT_TYPES),
});
const bodySchema = z.string().max(50_000, { error: "Metin çok uzun." });

const run = (scope: string, fn: Parameters<typeof runAdmin>[2]) => runAdmin("metin.yonet", scope, fn, [LegalTextError]);

export type TextMetaValues = { key?: string; title: string; description: string; consentType: string };

export async function createTextAction(values: TextMetaValues): Promise<ActionResult> {
  const parsed = metaSchema.extend({ key: keySchema }).safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  return run("create legal text", () => {
    createLegalText(parsed.data);
    return { action: "metin.ekle", entity: "legal_text", entityId: parsed.data.key, summary: `Metin eklendi: ${parsed.data.title}` };
  });
}

export async function updateTextMetaAction(key: string, values: TextMetaValues): Promise<ActionResult> {
  if (!keySchema.safeParse(key).success) return { ok: false, error: "Geçersiz metin." };
  const parsed = metaSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  return run("update legal text", () => {
    updateLegalTextMeta(key, parsed.data);
    return { action: "metin.duzenle", entity: "legal_text", entityId: key, summary: `Metin bilgileri güncellendi: ${parsed.data.title}` };
  });
}

export async function saveDraftAction(key: string, body: string): Promise<ActionResult> {
  if (!keySchema.safeParse(key).success) return { ok: false, error: "Geçersiz metin." };
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return invalid(parsed.error);
  return run("save legal draft", (_a, user) => {
    saveDraft(key, parsed.data, user.id);
  });
}

export async function publishDraftAction(key: string): Promise<ActionResult> {
  if (!keySchema.safeParse(key).success) return { ok: false, error: "Geçersiz metin." };
  return run("publish legal text", () => {
    const v = publishDraft(key);
    return { action: "metin.yayinla", entity: "legal_text", entityId: key, summary: `${key} sürüm ${v.version} yayınlandı` };
  });
}

export async function discardDraftAction(key: string): Promise<ActionResult> {
  if (!keySchema.safeParse(key).success) return { ok: false, error: "Geçersiz metin." };
  return run("discard legal draft", () => {
    discardDraft(key);
  });
}

/** Veli yazılı onay verdiğinde (kâğıt form) admin kaydeder; yöntem "admin_attest" olarak işaretlenir. */
export async function attestConsentAction(registrationId: number, versionId: number, accepted: boolean, note: string): Promise<ActionResult> {
  if (!idSchema.safeParse(registrationId).success || !idSchema.safeParse(versionId).success) return { ok: false, error: "Geçersiz istek." };
  const cleanNote = note.trim().slice(0, 300) || null;
  return runAdmin(
    "kayit.duzenle",
    "attest consent",
    async (actor) => {
      const reg = getRegistration(registrationId);
      if (!reg) throw new LegalTextError("Kayıt bulunamadı.");
      const version = getVersion(versionId);
      recordConsent({ userId: actor.id, registrationId, versionId, accepted, method: "admin_attest", note: cleanNote, ip: (await getRequestMeta()).ip });
      return {
        action: "onay.kaydet",
        entity: "registration",
        entityId: registrationId,
        summary: `${reg.studentFullName}: ${version?.textKey ?? versionId} v${version?.version ?? "?"} ${accepted ? "kabul" : "ret"} (yazılı beyan)`,
      };
    },
    [LegalTextError],
  );
}

export type ConsentRow = {
  key: string;
  title: string;
  type: string;
  versionId: number;
  version: number;
  last: { accepted: boolean; version: number; method: string; at: string } | null;
  current: boolean;
};

export async function getConsentStatesAction(registrationId: number): Promise<ConsentRow[] | null> {
  if (!idSchema.safeParse(registrationId).success) return null;
  await requireAdmin("kayit.gor");
  return consentStatesForRegistration(registrationId).map((s) => ({
    key: s.text.key,
    title: s.text.title,
    type: s.text.consentType,
    versionId: s.version.id,
    version: s.version.version,
    last: s.last ? { accepted: s.last.accepted, version: s.last.version, method: s.last.method, at: s.last.createdAt } : null,
    current: s.current,
  }));
}
