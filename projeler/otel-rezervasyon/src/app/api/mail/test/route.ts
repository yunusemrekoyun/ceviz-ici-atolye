import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { getMailConfig, renderBrandedMail, sendMail } from '@/lib/mail';

export const runtime = 'nodejs';

const testMailSchema = z.object({
  to: z.string().email().max(254).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);

  if (!auth) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (auth.user.roleSlug !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }

  const parsed = testMailSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: 'Geçersiz e-posta adresi.' },
      { status: 400 },
    );
  }

  const config = getMailConfig();

  if (!config.isConfigured) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Mail ayarları eksik.',
        missing: config.missing,
      },
      { status: 503 },
    );
  }

  const to = parsed.data.to ?? auth.user.email;
  const { html, text } = renderBrandedMail({
    title: 'Mail sistemi testi',
    preview: 'Kütahya Garden Otel mail sistemi başarıyla çalışıyor.',
    intro: 'Bu e-posta, Kütahya Garden Otel mail altyapısının çalıştığını doğrulamak için gönderildi.',
    lines: [
      'Bu endpoint sadece admin rolüyle kullanılabilir.',
      'Gelecek adımlarda şifre sıfırlama, rol atama, rezervasyon ve operasyon bildirimleri aynı global servis üzerinden gönderilecek.',
    ],
  });

  try {
    const result = await sendMail({
      to,
      subject: 'Kütahya Garden Otel mail sistemi testi',
      html,
      text,
    });

    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    });
  } catch (error) {
    console.error('Test mail failed.', error);

    return NextResponse.json(
      { ok: false, message: 'Test e-postası gönderilemedi.' },
      { status: 503 },
    );
  }
}
