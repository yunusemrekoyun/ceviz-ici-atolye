import { and, asc, desc, eq, inArray, max, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { consents, legalTexts, legalTextVersions, type Consent, type LegalText, type LegalTextVersion } from "@/lib/db/schema";

import { CONSENT_TYPES, type ConsentType } from "@/lib/legal-shared";

export { CONSENT_TYPES, type ConsentType };

export class LegalTextError extends Error {}

export type LegalTextSummary = LegalText & {
  published: LegalTextVersion | null;
  draft: LegalTextVersion | null;
  versions: Pick<LegalTextVersion, "id" | "version" | "status" | "publishedAt" | "createdAt">[];
  acceptedCount: number;
  declinedCount: number;
};

function latestPublished(key: string): LegalTextVersion | null {
  return (
    getDb()
      .select()
      .from(legalTextVersions)
      .where(and(eq(legalTextVersions.textKey, key), eq(legalTextVersions.status, "published")))
      .orderBy(desc(legalTextVersions.version))
      .get() ?? null
  );
}

export function getPublishedText(key: string): { text: LegalText; version: LegalTextVersion } | null {
  const text = getDb().select().from(legalTexts).where(eq(legalTexts.key, key)).get();
  if (!text) return null;
  const version = latestPublished(key);
  return version ? { text, version } : null;
}

export function listPublishedTexts(): { text: LegalText; version: LegalTextVersion }[] {
  const texts = getDb().select().from(legalTexts).orderBy(asc(legalTexts.sort), asc(legalTexts.title)).all();
  return texts.flatMap((text) => {
    const version = latestPublished(text.key);
    return version ? [{ text, version }] : [];
  });
}

export function listLegalTexts(): LegalTextSummary[] {
  const db = getDb();
  const texts = db.select().from(legalTexts).orderBy(asc(legalTexts.sort), asc(legalTexts.title)).all();
  const versions = db.select().from(legalTextVersions).orderBy(desc(legalTextVersions.version)).all();
  return texts.map((text) => {
    const own = versions.filter((v) => v.textKey === text.key);
    const published = own.find((v) => v.status === "published") ?? null;
    const draft = own.find((v) => v.status === "draft") ?? null;
    const stats = published ? consentStats(published.id) : { accepted: 0, declined: 0 };
    return {
      ...text,
      published,
      draft,
      versions: own.map(({ id, version, status, publishedAt, createdAt }) => ({ id, version, status, publishedAt, createdAt })),
      acceptedCount: stats.accepted,
      declinedCount: stats.declined,
    };
  });
}

export function getVersion(id: number): LegalTextVersion | null {
  return getDb().select().from(legalTextVersions).where(eq(legalTextVersions.id, id)).get() ?? null;
}

/** Bir sürüme verilen en güncel yanıtlar: öğrenci (yoksa kullanıcı) başına son kayıt sayılır. */
function consentStats(versionId: number): { accepted: number; declined: number } {
  const rows = getDb()
    .select({ subject: sql<string>`coalesce('r' || ${consents.registrationId}, 'u' || ${consents.userId})`, accepted: consents.accepted, id: consents.id })
    .from(consents)
    .where(eq(consents.versionId, versionId))
    .orderBy(asc(consents.id))
    .all();
  const last = new Map<string, boolean>();
  for (const r of rows) last.set(r.subject, r.accepted);
  let accepted = 0;
  for (const v of last.values()) if (v) accepted++;
  return { accepted, declined: last.size - accepted };
}

const KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function createLegalText(input: { key: string; title: string; description: string | null; consentType: ConsentType }): LegalText {
  if (!KEY_PATTERN.test(input.key)) throw new LegalTextError("Kısa ad yalnız küçük harf, rakam ve tire içerebilir.");
  const db = getDb();
  if (db.select().from(legalTexts).where(eq(legalTexts.key, input.key)).get()) throw new LegalTextError("Bu kısa adla bir metin zaten var.");
  const sort = (db.select({ value: max(legalTexts.sort) }).from(legalTexts).get()?.value ?? 0) + 10;
  return db.insert(legalTexts).values({ ...input, sort }).returning().get();
}

export function updateLegalTextMeta(key: string, input: { title: string; description: string | null; consentType: ConsentType }): void {
  const updated = getDb().update(legalTexts).set(input).where(eq(legalTexts.key, key)).returning().get();
  if (!updated) throw new LegalTextError("Metin bulunamadı.");
}

/** Taslağı kaydeder: varsa mevcut taslağın üzerine, yoksa yeni sürüm numarasıyla. Yayınlanmış sürüm değişmez. */
export function saveDraft(key: string, body: string, userId: number | null): LegalTextVersion {
  const db = getDb();
  return db.transaction(() => {
    if (!db.select().from(legalTexts).where(eq(legalTexts.key, key)).get()) throw new LegalTextError("Metin bulunamadı.");
    const draft = db
      .select()
      .from(legalTextVersions)
      .where(and(eq(legalTextVersions.textKey, key), eq(legalTextVersions.status, "draft")))
      .get();
    if (draft) {
      return db.update(legalTextVersions).set({ body, createdBy: userId }).where(eq(legalTextVersions.id, draft.id)).returning().get();
    }
    const next = (db.select({ value: max(legalTextVersions.version) }).from(legalTextVersions).where(eq(legalTextVersions.textKey, key)).get()?.value ?? 0) + 1;
    return db.insert(legalTextVersions).values({ textKey: key, version: next, body, status: "draft", createdBy: userId }).returning().get();
  });
}

export function publishDraft(key: string): LegalTextVersion {
  const db = getDb();
  const draft = db
    .select()
    .from(legalTextVersions)
    .where(and(eq(legalTextVersions.textKey, key), eq(legalTextVersions.status, "draft")))
    .get();
  if (!draft) throw new LegalTextError("Yayınlanacak taslak yok.");
  if (!draft.body.trim()) throw new LegalTextError("Boş metin yayınlanamaz.");
  const published = latestPublished(key);
  if (published && published.body.trim() === draft.body.trim()) throw new LegalTextError("Taslak yayındaki metinle aynı.");
  return db
    .update(legalTextVersions)
    .set({ status: "published", publishedAt: new Date().toISOString() })
    .where(eq(legalTextVersions.id, draft.id))
    .returning()
    .get();
}

export function discardDraft(key: string): void {
  getDb()
    .delete(legalTextVersions)
    .where(and(eq(legalTextVersions.textKey, key), eq(legalTextVersions.status, "draft")))
    .run();
}

/* ---------------- Onaylar ---------------- */

export type ConsentInput = {
  userId: number | null;
  registrationId: number | null;
  versionId: number;
  accepted: boolean;
  method: "panel" | "admin_attest";
  note?: string | null;
  ip?: string | null;
};

export function recordConsent(input: ConsentInput): Consent {
  const version = getVersion(input.versionId);
  if (!version || version.status !== "published") throw new LegalTextError("Metin sürümü bulunamadı.");
  return getDb()
    .insert(consents)
    .values({ ...input, textKey: version.textKey, note: input.note ?? null, ip: input.ip ?? null })
    .returning()
    .get();
}

export type ConsentState = {
  text: LegalText;
  version: LegalTextVersion;
  /** Bu öğrenci için metnin herhangi bir sürümüne verilmiş son yanıt. */
  last: (Consent & { version: number }) | null;
  /** Yayındaki sürüme yanıt verilmiş mi? */
  current: boolean;
};

/** Öğrenci için her yayındaki metnin onay durumu (kardeşler ayrı ayrı onaylanır, fotoğraf izni gibi). */
export function consentStatesForRegistration(registrationId: number): ConsentState[] {
  const db = getDb();
  const rows = db
    .select({ consent: consents, version: legalTextVersions.version })
    .from(consents)
    .innerJoin(legalTextVersions, eq(consents.versionId, legalTextVersions.id))
    .where(eq(consents.registrationId, registrationId))
    .orderBy(asc(consents.id))
    .all();
  const last = new Map<string, Consent & { version: number }>();
  for (const r of rows) last.set(r.consent.textKey, { ...r.consent, version: r.version });
  return listPublishedTexts()
    .filter(({ text }) => text.consentType !== "info")
    .map(({ text, version }) => {
      const l = last.get(text.key) ?? null;
      return { text, version, last: l, current: l?.versionId === version.id };
    });
}

/** Fotoğraf izni verilmiş mi (en son yanıt kabul olmalı; sürüm değişse de geçerli sayılır). */
export function hasPhotoConsent(registrationId: number): boolean {
  const row = getDb()
    .select({ accepted: consents.accepted })
    .from(consents)
    .where(and(eq(consents.registrationId, registrationId), eq(consents.textKey, "foto-izni")))
    .orderBy(desc(consents.id))
    .get();
  return Boolean(row?.accepted);
}

/** Birden çok öğrenci için fotoğraf izni (son yanıt kabul mü). */
export function hasPhotoConsentMap(registrationIds: number[]): Map<number, boolean> {
  const out = new Map<number, boolean>();
  if (registrationIds.length === 0) return out;
  const rows = getDb()
    .select({ reg: consents.registrationId, accepted: consents.accepted })
    .from(consents)
    .where(and(inArray(consents.registrationId, registrationIds), eq(consents.textKey, "foto-izni")))
    .orderBy(asc(consents.id))
    .all();
  for (const r of rows) if (r.reg !== null) out.set(r.reg, r.accepted);
  return out;
}

/** Birden çok öğrenci için eksik zorunlu onaylar (veli paneli girişinde gösterilir). */
export function missingRequiredConsents(registrationIds: number[]): { registrationId: number; text: LegalText; version: LegalTextVersion }[] {
  if (registrationIds.length === 0) return [];
  const required = listPublishedTexts().filter(({ text }) => text.consentType === "required");
  const rows = getDb()
    .select({ registrationId: consents.registrationId, versionId: consents.versionId, accepted: consents.accepted })
    .from(consents)
    .where(inArray(consents.registrationId, registrationIds))
    .orderBy(asc(consents.id))
    .all();
  const answered = new Map<string, boolean>();
  for (const r of rows) answered.set(`${r.registrationId}:${r.versionId}`, r.accepted);
  const out: { registrationId: number; text: LegalText; version: LegalTextVersion }[] = [];
  for (const registrationId of registrationIds)
    for (const { text, version } of required) if (!answered.get(`${registrationId}:${version.id}`)) out.push({ registrationId, text, version });
  return out;
}
