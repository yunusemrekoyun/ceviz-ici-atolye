import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import { AUTH_COOKIE } from "@/lib/auth";

const ADMIN_PREFIX = "/admin";
const MEMBER_PREFIX = "/panel";
const TRAINER_PREFIX = "/egitmen";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;

  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (!payload) return NextResponse.redirect(new URL("/giris?next=" + pathname, req.url));
    if (!["ADMIN", "STAFF"].includes(payload.role)) return NextResponse.redirect(new URL("/", req.url));
  }

  if (pathname.startsWith(MEMBER_PREFIX)) {
    if (!payload) return NextResponse.redirect(new URL("/giris?next=" + pathname, req.url));
  }

  if (pathname.startsWith(TRAINER_PREFIX)) {
    if (!payload) return NextResponse.redirect(new URL("/giris?next=" + pathname, req.url));
    if (payload.role !== "TRAINER") return NextResponse.redirect(new URL("/", req.url));
  }

  if ((pathname === "/giris" || pathname === "/kayit") && payload) {
    let target = "/panel";
    if (["ADMIN", "STAFF"].includes(payload.role)) target = "/admin";
    else if (payload.role === "TRAINER") target = "/egitmen";
    return NextResponse.redirect(new URL(target, req.url));
  }

  // Layout'un mevcut path'i okuyabilmesi için header ekle
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/admin/:path*", "/panel/:path*", "/egitmen/:path*", "/giris", "/kayit"],
};
