import type { NextRequest } from "next/server";

/**
 * İstemci IP'sini standart biçimde okur. Proxy/CDN arkasında ilk hop
 * (x-forwarded-for'un ilk değeri) gerçek istemcidir.
 */
export function getClientIp(req: NextRequest | Request): string | undefined {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || undefined;
  return req.headers.get("x-real-ip")?.trim() || undefined;
}
