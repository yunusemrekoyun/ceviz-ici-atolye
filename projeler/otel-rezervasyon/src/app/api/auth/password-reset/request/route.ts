import { createHash, randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { renderBrandedMail, sendMail } from '@/lib/mail';

export const runtime = 'nodejs';

const RESET_TOKEN_TTL_MINUTES = 30;

const requestSchema = z.object({
  email: z.string().email().max(254).transform((value) => value.trim().toLowerCase()),
});

function createResetToken() {
  return randomBytes(48).toString('base64url');
}

function hashResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function successResponse() {
  return NextResponse.json({
    ok: true,
    message: 'Bu e-posta sistemde kayıtlıysa şifre sıfırlama bağlantısı gönderildi.',
  });
}

function getAppUrl(request: NextRequest) {
  return process.env.APP_URL?.trim() || request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return successResponse();
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: {
        id: true,
        email: true,
        firstName: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return successResponse();
    }

    const token = createResetToken();
    const resetUrl = new URL('/reset-password', getAppUrl(request));
    resetUrl.searchParams.set('token', token);

    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: {
          usedAt: new Date(),
        },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashResetToken(token),
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
        },
      }),
    ]);

    const { html, text } = renderBrandedMail({
      title: 'Şifre sıfırlama bağlantınız',
      preview: 'Kütahya Garden Otel hesabınız için güvenli şifre sıfırlama bağlantısı.',
      intro: `Merhaba${user.firstName ? ` ${user.firstName}` : ''}, şifrenizi yenilemek için aşağıdaki bağlantıyı kullanabilirsiniz.`,
      lines: [
        `Bağlantı ${RESET_TOKEN_TTL_MINUTES} dakika boyunca geçerlidir ve yalnızca bir kez kullanılabilir.`,
        'Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz; hesabınızda herhangi bir değişiklik yapılmaz.',
      ],
      action: {
        label: 'Şifremi Sıfırla',
        url: resetUrl.toString(),
      },
    });

    await sendMail({
      to: user.email,
      subject: 'Kütahya Garden Otel şifre sıfırlama bağlantınız',
      html,
      text,
    });
  } catch (error) {
    console.error('Password reset request failed.', error);
  }

  return successResponse();
}
