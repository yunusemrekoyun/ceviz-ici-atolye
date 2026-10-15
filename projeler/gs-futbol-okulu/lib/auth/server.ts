import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { jsonNoStore } from "@/lib/api";
import { LOGIN_PATH, SESSION_COOKIE } from "./cookie";
import { getClientIp } from "@/lib/rate-limit";
import { validateSessionToken, type RequestMeta, type SessionUser } from "./sessions";
import type { Permission, Portal } from "./permissions";

/** İstek başına bir kez çözülen oturum sahibi (layout + sayfa aynı sonucu paylaşır). Rol ayrımı yapmaz. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(token, new Date(), await getRequestMeta());
});

/** Güvenlik kaydı için istemci IP'si (reverse proxy başlığından) ve tarayıcı bilgisi. */
export async function getRequestMeta(): Promise<RequestMeta> {
  const h = await headers();
  const ip = getClientIp(h);
  return { ip: ip === "unknown" ? null : ip, userAgent: h.get("user-agent") };
}

export function can(user: Pick<SessionUser, "permissions"> | null | undefined, permission: Permission): boolean {
  return Boolean(user?.permissions.includes(permission));
}

/** Yönetim paneli oturumu; antrenör/veli oturumu sayılmaz. */
export async function getCurrentAdmin(): Promise<SessionUser | null> {
  const user = await getCurrentUser();
  return user?.portal === "admin" ? user : null;
}

/** Yönetim paneli sayfaları: oturum yoksa girişe, izin yoksa "yetkiniz yok" sayfasına. */
export async function requireAdmin(permission?: Permission): Promise<SessionUser> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(LOGIN_PATH);
  if (permission && !can(admin, permission)) redirect("/admin/yetkisiz");
  return admin;
}

/** Antrenör / veli panelleri: doğru panelin oturumu yoksa ortak giriş sayfasına. */
export async function requirePortal(portal: Exclude<Portal, "admin">, permission?: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.portal !== portal) redirect(`/giris?next=${portal === "coach" ? "/antrenor" : "/veli"}`);
  if (permission && !can(user, permission)) redirect(portal === "coach" ? "/antrenor" : "/veli");
  return user;
}

function isSameOrigin(request: Request, requestHeaders: Headers): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim() || requestHeaders.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * API route'ları için: yetkisizse döndürülecek yanıt, yetkiliyse null.
 * Veri değiştiren isteklerde ayrıca Origin kontrolü yapılır (CSRF'e karşı SameSite çereze ek katman).
 */
export async function requireAdminApi(request: Request, permission: Permission = "kayit.gor"): Promise<Response | null> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return jsonNoStore({ ok: false, formError: "Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın." }, { status: 401 });
  }
  if (!can(admin, permission)) return jsonNoStore({ ok: false, formError: "Bu işlem için yetkiniz yok." }, { status: 403 });
  if (request.method !== "GET" && request.method !== "HEAD" && !isSameOrigin(request, await headers())) {
    return jsonNoStore({ ok: false, formError: "İstek reddedildi." }, { status: 403 });
  }
  return null;
}
