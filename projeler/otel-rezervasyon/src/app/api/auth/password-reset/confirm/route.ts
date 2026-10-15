import { createHash } from 'node:crypto';
import argon2 from 'argon2';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { renderBrandedMail, sendMail } from '@/lib/mail';

export const runtime = 'nodejs';

const confirmSchema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(8).max(200),
});

function hashResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function POST(request: NextRequest) {
  const parsed = confirmSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: 'Şifre sıfırlama bağlantısı geçersiz.' },
      { status: 400 },
    );
  }

  const tokenHash = hashResetToken(parsed.data.token);

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          isActive: true,
        },
      },
    },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt.getTime() <= Date.now() ||
    !resetToken.user.isActive
  ) {
    return NextResponse.json(
      { ok: false, message: 'Şifre sıfırlama bağlantısı süresi dolmuş veya daha önce kullanılmış.' },
      { status: 400 },
    );
  }

  try {
    const passwordHash = await argon2.hash(parsed.data.password, { type: argon2.argon2id });

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      prisma.session.updateMany({
        where: {
          userId: resetToken.userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      }),
    ]);

    const { html, text } = renderBrandedMail({
      title: 'Şifreniz değiştirildi',
      preview: 'Kütahya Garden Otel hesabınızın şifresi başarıyla değiştirildi.',
      intro: `Merhaba${resetToken.user.firstName ? ` ${resetToken.user.firstName}` : ''}, hesabınızın şifresi başarıyla değiştirildi.`,
      lines: [
        'Güvenliğiniz için açık oturumlarınız kapatıldı. Yeni şifrenizle tekrar giriş yapabilirsiniz.',
        'Bu işlemi siz yapmadıysanız lütfen otel yönetimiyle hemen iletişime geçin.',
      ],
    });

    sendMail({
      to: resetToken.user.email,
      subject: 'Kütahya Garden Otel şifreniz değiştirildi',
      html,
      text,
    }).catch((error) => {
      console.error('Password changed mail failed.', error);
    });

    return NextResponse.json({
      ok: true,
      message: 'Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.',
    });
  } catch (error) {
    console.error('Password reset confirm failed.', error);

    return NextResponse.json(
      { ok: false, message: 'Şifre şu anda güncellenemedi.' },
      { status: 503 },
    );
  }
}
