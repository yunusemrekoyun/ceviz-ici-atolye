import { NextRequest, NextResponse } from 'next/server';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });

  const includeProfile = request.nextUrl.searchParams.get('profile') === 'true';
  const profile = includeProfile
    ? await prisma.user.findUnique({
        where: { id: auth.user.id },
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          birthDate: true,
          gender: true,
          nationality: true,
          tcKimlikNo: true,
          passportNo: true,
          passportExpiry: true,
          emailVerified: true,
        },
      })
    : null;

  return NextResponse.json({
    ok: true,
    user: {
      id:       auth.user.id,
      email:    auth.user.email,
      roleName: auth.user.roleName,
      roleSlug: auth.user.roleSlug,
      emailVerified: auth.user.emailVerified,
      ...(includeProfile && {
        profile: profile
          ? {
              firstName: profile.firstName,
              lastName: profile.lastName,
              phone: profile.phone,
              birthDate: profile.birthDate?.toISOString().split('T')[0] ?? null,
              gender: profile.gender,
              nationality: profile.nationality,
              tcKimlikNo: profile.tcKimlikNo,
              passportNo: profile.passportNo,
              passportExpiry: profile.passportExpiry?.toISOString().split('T')[0] ?? null,
              emailVerified: profile.emailVerified,
            }
          : null,
      }),
    },
  });
}
