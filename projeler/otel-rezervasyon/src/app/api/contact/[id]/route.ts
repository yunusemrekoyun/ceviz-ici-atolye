import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { renderBrandedMail, sendMail } from '@/lib/mail';

export const runtime = 'nodejs';

const patchSchema = z.object({
  adminReply: z.string().trim().min(1).max(2000).optional(),
  status: z.enum(['open', 'resolved']).optional(),
  notifyCustomer: z.boolean().optional(),
}).refine((d) => d.adminReply !== undefined || d.status !== undefined, {
  message: 'Güncellenecek bir alan gönderin.',
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Geçersiz istek.' }, { status: 400 });
  }

  const { id } = await params;
  const contact = await prisma.contactRequest.findUnique({ where: { id } });
  if (!contact) {
    return NextResponse.json({ ok: false, message: 'Talep bulunamadı.' }, { status: 404 });
  }

  const isStaff = ['admin', 'personel'].includes(auth.user.roleSlug);
  const isOwner = contact.userId === auth.user.id || (!!contact.email && contact.email === auth.user.email);
  if (!isStaff && !isOwner) {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }
  // Customers may resolve/reopen their own ticket but not write a staff reply here.
  if (!isStaff && parsed.data.adminReply !== undefined) {
    return NextResponse.json({ ok: false, message: 'Yetkisiz alan.' }, { status: 403 });
  }

  const updated = await prisma.contactRequest.update({
    where: { id },
    data: {
      ...(isStaff && parsed.data.adminReply !== undefined ? {
        adminReply:  parsed.data.adminReply,
        repliedAt:   new Date(),
        repliedById: auth.user.id,
      } : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    },
  });

  // Staff resolving with the "notify customer" option → send a resolved email.
  if (isStaff && parsed.data.status === 'resolved' && parsed.data.notifyCustomer && contact.email) {
    const { html, text } = renderBrandedMail({
      title: `Destek talebiniz çözüldü — ${contact.ticketId}`,
      preview: 'Talebiniz çözüme kavuşturuldu.',
      intro: `Merhaba ${contact.name}, ${contact.ticketId} numaralı destek talebiniz çözüldü olarak işaretlendi.`,
      lines: ['Hâlâ devam eden bir sorun varsa hesabınızdaki Destek bölümünden tekrar yazabilirsiniz.'],
    });
    sendMail({ to: contact.email, subject: `Destek talebiniz çözüldü — ${contact.ticketId}`, html, text }).catch(console.error);
  }

  return NextResponse.json({ ok: true, contact: updated });
}
