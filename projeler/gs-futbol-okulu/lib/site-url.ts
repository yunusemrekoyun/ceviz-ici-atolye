import { PUBLIC_FORM_PATH } from "@/lib/constants";

/**
 * Sitenin dış adresi. Öncelik: NEXT_PUBLIC_SITE_URL env; yoksa reverse proxy başlıklarından türetilir.
 * QR kod bu adres + /on-kayit içeriğiyle üretilir.
 */
export function getSiteUrl(headers?: Headers): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  if (headers) {
    const proto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
    const host = headers.get("x-forwarded-host")?.split(",")[0]?.trim() || headers.get("host")?.trim();
    if (host) return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}

export function getPublicFormUrl(headers?: Headers): string {
  return `${getSiteUrl(headers)}${PUBLIC_FORM_PATH}`;
}
