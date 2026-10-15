import { NextRequest, NextResponse } from 'next/server';
import { rotateRefreshSession, setAuthCookies } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const issued = await rotateRefreshSession(request).catch((error) => {
    console.error('Refresh failed.', error);
    return null;
  });

  if (!issued) {
    return NextResponse.json(
      { ok: false, message: 'Oturum yenilenemedi.' },
      { status: 401 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    user: issued.user,
  });

  setAuthCookies(response, issued.accessToken, issued.refreshToken);

  return response;
}
