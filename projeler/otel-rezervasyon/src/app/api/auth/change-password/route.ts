import argon2 from 'argon2';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { renderBrandedMail, sendMail } from '@/lib/mail';

export const runtime = 'nodejs';

const schema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    newPassword:     z.string().min(8).max(200),
    confirmPassword: z.string().min(8).max(200),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Yeni şifreler eşleşmiyor.',
    path: ['confirmPassword'],
  });

export async function POST(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message ?? 'Geçersiz veri.' },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { passwordHash: true, firstName: true, email: true },
  });
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const valid = await argon2.verify(user.passwordHash, parsed.data.currentPassword);
  if (!valid) {
    return NextResponse.json(
      { ok: false, message: 'Mevcut şifre hatalı.' },
      { status: 400 },
    );
  }

  const passwordHash = await argon2.hash(parsed.data.newPassword, { type: argon2.argon2id });

  await prisma.$transaction([
    prisma.user.update({ where: { id: auth.user.id }, data: { passwordHash } }),
    prisma.session.updateMany({
      where: { userId: auth.user.id, revokedAt: null, id: { not: auth.sessionId } },
      data: { revokedAt: new Date() },
    }),
  ]);

  const { html, text } = renderBrandedMail({
    title: 'Şifreniz değiştirildi',
    preview: 'Kütahya Garden Otel hesabınızın şifresi başarıyla değiştirildi.',
    intro: `Merhaba${user.firstName ? ` ${user.firstName}` : ''}, şifreniz başarıyla güncellendi.`,
    lines: [
      'Diğer oturumlardaki bağlantılarınız güvenlik amacıyla kapatıldı.',
      'Bu işlemi siz yapmadıysanız lütfen otel yönetimiyle iletişime geçin.',
    ],
  });
  sendMail({
    to: user.email,
    subject: 'Kütahya Garden Otel şifreniz değiştirildi',
    html,
    text,
  }).catch(console.error);

  return NextResponse.json({ ok: true, message: 'Şifreniz güncellendi.' });
}
