import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function getAppUrl(request: NextRequest) {
  return process.env.APP_URL?.trim() || request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim();

  const failUrl = new URL('/musteri', getAppUrl(request));
  failUrl.searchParams.set('emailVerified', '0');

  if (!token) {
    return NextResponse.redirect(failUrl);
  }

  try {
    const record = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { select: { id: true, emailVerified: true } } },
    });

    if (
      !record ||
      record.usedAt ||
      record.expiresAt < new Date()
    ) {
      return NextResponse.redirect(failUrl);
    }

    await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      }),
    ]);

    const successUrl = new URL('/musteri', getAppUrl(request));
    successUrl.searchParams.set('emailVerified', '1');
    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error('Email verification failed.', error);
    return NextResponse.redirect(failUrl);
  }
}
