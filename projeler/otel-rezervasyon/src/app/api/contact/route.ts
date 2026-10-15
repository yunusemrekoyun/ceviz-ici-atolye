import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { renderBrandedMail, sendMail } from '@/lib/mail';

export const runtime = 'nodejs';

const contactSchema = z.object({
  name:     z.string().trim().min(1).max(120),
  email:    z.string().trim().email().max(254).optional(),
  category: z.string().trim().min(1).max(120).default('General inquiry'),
  message:  z.string().trim().min(1).max(2000),
});

export async function GET(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 401 });

  const isStaff = ['admin', 'personel'].includes(auth.user.roleSlug);

  try {
    const requests = await prisma.contactRequest.findMany({
      where: isStaff ? {} : { OR: [{ userId: auth.user.id }, { email: auth.user.email }] },
      orderBy: { createdAt: 'desc' },
      take: isStaff ? 200 : 50,
    });
    return NextResponse.json({ ok: true, requests });
  } catch (error) {
    console.error('Contact requests fetch failed.', error);
    return NextResponse.json({ ok: false, message: 'Talepler alınamadı.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const parsed = contactSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: 'Name and message are required.' },
      { status: 400 },
    );
  }

  const ticketId = `GH-CON-${Date.now().toString(36).toUpperCase()}`;
  const auth = await getAuthContextFromRequest(request).catch(() => null);

  // Logged-in users' email comes from their account; public visitors supply it
  // on the form so staff replies actually reach them.
  const effectiveEmail = auth?.user.email ?? parsed.data.email;

  try {
    await prisma.contactRequest.create({
      data: {
        userId:   auth?.user.id,
        email:    effectiveEmail,
        name:     parsed.data.name,
        category: parsed.data.category,
        message:  parsed.data.message,
        ticketId,
        messages: { create: { sender: 'customer', body: parsed.data.message, authorId: auth?.user.id } },
      },
    });
  } catch (error) {
    console.error('Contact request persistence failed.', error);

    return NextResponse.json(
      { ok: false, message: 'Request could not be stored.' },
      { status: 503 },
    );
  }

  if (effectiveEmail) {
    const { html, text } = renderBrandedMail({
      title: 'Talebiniz alındı',
      preview: `Destek talebiniz alındı. Bilet no: ${ticketId}`,
      intro: `Merhaba ${parsed.data.name}, destek talebiniz alınmıştır.`,
      lines: [
        `Bilet numaranız: ${ticketId}`,
        'Ekibimiz en kısa sürede size dönecektir. Lütfen aynı konu için tekrar talep oluşturmayınız.',
      ],
    });
    sendMail({
      to: effectiveEmail,
      subject: `Destek talebiniz alındı — ${ticketId}`,
      html,
      text,
    }).catch(console.error);
  }

  return NextResponse.json({
    ok: true,
    ticketId,
    category: parsed.data.category,
    receivedAt: new Date().toISOString(),
  });
}
