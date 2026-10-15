import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, isRoleSlug } from '@/lib/auth/constants';
import { checkRateLimit, clientIpFromHeaders, tierForRequest } from '@/lib/rate-limit';

function getProtectedRole(pathname: string) {
  const segment = pathname.split('/').filter(Boolean)[0];
  return segment && isRoleSlug(segment) ? segment : null;
}

async function verifyRoleFromAccessToken(token?: string) {
  const secret = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET;

  if (!token || !secret || secret.length < 32) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ['HS256'],
    });

    return typeof payload.roleSlug === 'string' && isRoleSlug(payload.roleSlug)
      ? payload.roleSlug
      : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1) Centralized rate limiting (single choke point) ──────────────────────
  // Only sensitive API endpoints are classified; normal browsing/GETs return
  // null and pass straight through, so real visitors are never throttled.
  const tier = tierForRequest(pathname, request.method);
  if (tier) {
    const ip = clientIpFromHeaders(request.headers);
    const { ok, retryAfter } = checkRateLimit(tier, ip);
    if (!ok) {
      return NextResponse.json(
        { ok: false, message: 'Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      );
    }
    return NextResponse.next();
  }

  // ── 2) Role-based page protection ──────────────────────────────────────────
  const requestedRole = getProtectedRole(pathname);

  if (!requestedRole) {
    return NextResponse.next();
  }

  const accessRole = await verifyRoleFromAccessToken(request.cookies.get(ACCESS_COOKIE_NAME)?.value);

  if (accessRole) {
    if (accessRole !== requestedRole) {
      return NextResponse.redirect(new URL(`/${accessRole}`, request.url));
    }

    return NextResponse.next();
  }

  if (request.cookies.get(REFRESH_COOKIE_NAME)?.value) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/', request.url));
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/personel/:path*',
    '/muhasebe/:path*',
    '/musteri/:path*',
    '/temizlikci/:path*',
  ],
};
