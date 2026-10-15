import crypto from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { studentCards, type StudentCard } from "@/lib/db/schema";

export class CardError extends Error {}

// Karışan karakterler (0/O, 1/I/L) yok; 8 karakter ≈ 40 bit, tahmin edilemez ve elle yazılabilir.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const CARD_CODE_PATTERN = /^[2-9A-HJKMNP-Z]{8}$/;

export function newCardCode(): string {
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Karttaki QR'ın adresi. Bu yol hiçbir sürümde değiştirilmez (basılı kartlar çöp olmasın). */
export function cardPath(code: string): string {
  return `/k/${code}`;
}

export function activeCard(registrationId: number): StudentCard | null {
  return (
    getDb()
      .select()
      .from(studentCards)
      .where(and(eq(studentCards.registrationId, registrationId), eq(studentCards.status, "active")))
      .orderBy(desc(studentCards.id))
      .get() ?? null
  );
}

export function activeCardsFor(ids: number[]): Map<number, StudentCard> {
  if (ids.length === 0) return new Map();
  const rows = getDb().select().from(studentCards).where(and(inArray(studentCards.registrationId, ids), eq(studentCards.status, "active"))).all();
  return new Map(rows.map((r) => [r.registrationId, r]));
}

export function cardByCode(code: string): StudentCard | null {
  const clean = code.trim().toUpperCase();
  if (!CARD_CODE_PATTERN.test(clean)) return null;
  return getDb().select().from(studentCards).where(eq(studentCards.code, clean)).get() ?? null;
}

/** Yeni kart: varsa eski aktif kart iptal edilir (kayıp / yeniden basım). */
export function issueCard(registrationId: number, userId: number | null, reason = "Yeni kart basıldı"): StudentCard {
  const db = getDb();
  return db.transaction(() => {
    db.update(studentCards)
      .set({ status: "revoked", revokedAt: new Date().toISOString(), revokedBy: userId, revokeReason: reason })
      .where(and(eq(studentCards.registrationId, registrationId), eq(studentCards.status, "active")))
      .run();
    for (let i = 0; i < 5; i++) {
      const row = db.insert(studentCards).values({ registrationId, code: newCardCode(), createdBy: userId }).onConflictDoNothing().returning().get();
      if (row) return row;
    }
    throw new CardError("Kart kodu üretilemedi, tekrar deneyin.");
  });
}

/** Öğrencinin aktif kartı yoksa oluşturur. */
export function ensureCard(registrationId: number, userId: number | null): StudentCard {
  return activeCard(registrationId) ?? issueCard(registrationId, userId);
}

export function revokeCard(registrationId: number, userId: number | null, reason: string): void {
  getDb()
    .update(studentCards)
    .set({ status: "revoked", revokedAt: new Date().toISOString(), revokedBy: userId, revokeReason: reason })
    .where(and(eq(studentCards.registrationId, registrationId), eq(studentCards.status, "active")))
    .run();
}

export function markPrinted(cardIds: number[]): void {
  if (cardIds.length === 0) return;
  getDb().update(studentCards).set({ printedAt: new Date().toISOString() }).where(inArray(studentCards.id, cardIds)).run();
}
