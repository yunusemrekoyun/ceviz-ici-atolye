import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_PATH, PORTAL_LOGIN_PATH, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/cookie";

/**
 * İlk savunma hattı: oturum çerezi hiç yoksa panel ve admin API'sine geçiş verilmez.
 * Çerezin geçerliliği (DB kontrolü) panel layout'unda ve her admin API route'unda ayrıca yapılır.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  // Tarayıcı manifesti çerezsiz ister. Bu adresler yalnız uygulama tanımı ve herkese açık okul armasıdır.
  // Öğrenci sayfaları ve indirilebilir kart bu istisnaya dahil değildir.
  if (pathname === "/veli/manifest.webmanifest" || /^\/veli\/ikon\/(180|192|512)$/.test(pathname)) return NextResponse.next();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    // Kayan süre: sayfa açılışlarında çerezin ömrü yeniden 7 güne uzar (oturumun kendisi DB'de ayrıca doğrulanır).
    // POST'larda (ör. çıkış) dokunulmaz ki çıkıştaki çerez silme işlemiyle çakışmasın.
    const response = NextResponse.next();
    if (request.method === "GET") response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  }
  if (pathname === LOGIN_PATH) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, formError: "Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  const url = request.nextUrl.clone();
  if (pathname.startsWith("/antrenor") || pathname.startsWith("/veli")) {
    url.pathname = PORTAL_LOGIN_PATH;
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  url.pathname = LOGIN_PATH;
  url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/antrenor/:path*", "/antrenor", "/veli/:path*", "/veli"],
};
