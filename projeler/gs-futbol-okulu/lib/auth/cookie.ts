/**
 * Oturum çerezi ayarları. Node API'si kullanmaz; proxy.ts tarafından da içe aktarılır.
 * Canlıda `__Host-` öneki: yalnızca HTTPS, Domain yok, Path=/ zorunlu (alt alan adlarından ezilemez).
 */
export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-gs_admin_session" : "gs_admin_session";

/** Mutlak oturum ömrü: aktif kullanımda bile en geç bu sürede yeniden giriş istenir. */
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/** Bu süre boyunca hiç istek gelmezse oturum düşer (çerez de her istekte bu süreyle yenilenir). */
export const SESSION_IDLE_SECONDS = 7 * 24 * 60 * 60;

export const LOGIN_PATH = "/admin/giris";
export const ADMIN_HOME = "/admin";

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_IDLE_SECONDS,
  };
}

/** Girişten sonra dönülecek adres yalnızca panel içi bir yol olabilir (açık yönlendirme engeli). */
export function safeNextPath(raw: unknown): string {
  if (typeof raw !== "string") return ADMIN_HOME;
  if (!/^\/admin(\/[A-Za-z0-9\-_/]*)?$/.test(raw) || raw.startsWith(LOGIN_PATH)) return ADMIN_HOME;
  return raw;
}

export const PORTAL_LOGIN_PATH = "/giris";

/** Antrenör / veli girişinden sonra dönülecek adres: yalnız kendi paneli. */
export function safePortalNext(raw: unknown, home: string): string {
  if (typeof raw !== "string") return home;
  return new RegExp(`^${home}(\\/[A-Za-z0-9\\-_/]*)?(\\?[A-Za-z0-9=&\\-_]*)?$`).test(raw) ? raw : home;
}
