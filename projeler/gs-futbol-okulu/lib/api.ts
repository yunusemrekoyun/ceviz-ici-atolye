import type { RegistrationFormValues } from "@/lib/validation";
import { NextResponse } from "next/server";
import type { Registration } from "@/lib/db/schema";
import { missingFields } from "@/lib/completeness";
import { computeAge, resolveContactParent, type ResolvedContactParent } from "@/lib/format";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
  "X-Robots-Tag": "noindex, nofollow",
} as const;

export function jsonNoStore<T>(body: T, init?: ResponseInit): NextResponse<T> {
  const headers = new Headers(init?.headers);
  for (const [k, v] of Object.entries(NO_STORE_HEADERS)) headers.set(k, v);
  return NextResponse.json(body, { ...init, headers });
}

/** Admin arayüzüne gönderilen kayıt: DB satırı + türetilmiş alanlar. */
export type RegistrationDto = Registration & {
  age: number | null;
  contact: ResolvedContactParent;
  /** Asıl kayıt için eksik olan bilgiler (boşsa kayıt tam). */
  missing: string[];
  /** Olası tekrar kayıtların kimlikleri (panelde hesaplanır). */
  duplicates?: number[];
  /** Veliden gelen, onay bekleyen güncel bilgiler. */
  submission?: { id: number; createdAt: string; values: RegistrationFormValues } | null;
};

export function toRegistrationDto(reg: Registration, now: Date = new Date()): RegistrationDto {
  return { ...reg, age: computeAge(reg.birthDate, now), contact: resolveContactParent(reg), missing: missingFields(reg) };
}

export function parseIdParam(raw: string): number | null {
  if (!/^\d{1,12}$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Content-Length üst sınırı: form verisi birkaç KB'ı geçmez. */
export const MAX_BODY_BYTES = 32 * 1024;

export function bodyTooLarge(headers: Headers): boolean {
  const len = Number(headers.get("content-length") ?? "0");
  return Number.isFinite(len) && len > MAX_BODY_BYTES;
}

/** Hata loglarında asla request body / kişisel veri yer almaz. */
export function logServerError(scope: string, err: unknown): void {
  const message = err instanceof Error ? `${err.name}: ${err.message}` : "unknown error";
  console.error(`[${scope}] ${message}`);
}
