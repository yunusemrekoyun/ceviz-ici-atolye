import { NextRequest, NextResponse } from 'next/server';
import { REFRESH_COOKIE_NAME } from '@/lib/auth/constants';
import { clearAuthCookies, getAuthContextFromRequest } from '@/lib/auth/session';
import { hashRefreshToken } from '@/lib/auth/tokens';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  const auth = await getAuthContextFromRequest(request).catch(() => null);

  try {
    if (refreshToken) {
      await prisma.session.updateMany({
        where: {
          tokenHash: hashRefreshToken(refreshToken),
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    if (auth) {
      await writeAuditLog({
        request,
        auth,
        action: 'auth.logout',
        entityType: 'user',
        entityId: auth.user.id,
        summary: `Oturum kapatıldı: ${auth.user.email}`,
      });
    }
  } catch (error) {
    console.error('Logout session revoke failed.', error);
  }

  const response = NextResponse.json({ ok: true });
  clearAuthCookies(response);

  return response;
}
