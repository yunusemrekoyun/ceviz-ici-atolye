import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

// Yalnızca cookie'nin varlığına bakan iyimser bir kontrol — DB'ye gitmez, imza/
// rol doğrulamaz. Otoriter kontrol (rol/ban dahil) ilgili layout'larda yapılır
// (bkz. src/app/admin/layout.tsx, src/app/(site)/hesap/layout.tsx).
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const signIn = new URL('/giris', request.url);
    signIn.searchParams.set('callbackURL', request.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/hesap/:path*'],
};
