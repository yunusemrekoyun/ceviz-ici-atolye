import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mail';
import { renderVerificationEmail } from '@/lib/mail/hotel-templates';
import { getAuthContextFromRequest } from '@/lib/auth/session';

export const runtime = 'nodejs';

const TOKEN_TTL_HOURS = 24;

function createToken() {
  return randomBytes(48).toString('base64url');
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function getAppUrl(request: NextRequest) {
  return process.env.APP_URL?.trim() || request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { id: true, email: true, firstName: true, emailVerified: true },
  });

  if (!user) return NextResponse.json({ ok: false }, { status: 404 });
  if (user.emailVerified) {
    return NextResponse.json({ ok: true, message: 'E-posta zaten doğrulanmış.' });
  }

  const token = createToken();
  const verifyUrl = new URL('/api/auth/verify-email/confirm', getAppUrl(request));
  verifyUrl.searchParams.set('token', token);

  await prisma.$transaction([
    prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    }),
    prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000),
      },
    }),
  ]);

  const { html, text } = renderVerificationEmail(user.firstName ?? '', verifyUrl.toString());

  sendMail({ to: user.email, subject: 'E-posta adresinizi doğrulayın', html, text }).catch(console.error);

  return NextResponse.json({ ok: true });
}
