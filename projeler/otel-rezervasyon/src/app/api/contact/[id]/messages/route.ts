import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { renderBrandedMail, sendMail } from '@/lib/mail';

export const runtime = 'nodejs';

type Auth = NonNullable<Awaited<ReturnType<typeof getAuthContextFromRequest>>>;

function access(contact: { userId: string | null; email: string | null }, auth: Auth) {
  const isStaff = ['admin', 'personel'].includes(auth.user.roleSlug);
  const isOwner = contact.userId === auth.user.id || (!!contact.email && contact.email === auth.user.email);
  return { isStaff, allowed: isStaff || isOwner };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 401 });

  const { id } = await params;
  const contact = await prisma.contactRequest.findUnique({ where: { id } });
  if (!contact) return NextResponse.json({ ok: false, message: 'Talep bulunamadı.' }, { status: 404 });
  if (!access(contact, auth).allowed) return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });

  const rows = await prisma.contactMessage.findMany({
    where: { contactRequestId: id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, sender: true, body: true, createdAt: true },
  });

  // Older requests created before the thread feature — synthesize from columns.
  const messages = rows.length > 0 ? rows : [
    { id: 'init', sender: 'customer', body: contact.message, createdAt: contact.createdAt },
    ...(contact.adminReply ? [{ id: 'reply', sender: 'staff', body: contact.adminReply, createdAt: contact.repliedAt ?? contact.createdAt }] : []),
  ];

  return NextResponse.json({ ok: true, status: contact.status, messages });
}

const postSchema = z.object({ body: z.string().trim().min(1).max(2000) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 401 });

  const { id } = await params;
  const contact = await prisma.contactRequest.findUnique({ where: { id } });
  if (!contact) return NextResponse.json({ ok: false, message: 'Talep bulunamadı.' }, { status: 404 });

  const { isStaff, allowed } = access(contact, auth);
  if (!allowed) return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: 'Mesaj gerekli.' }, { status: 400 });

  const sender = isStaff ? 'staff' : 'customer';

  const message = await prisma.$transaction(async (tx) => {
    // Backfill the original thread the first time a reply is added.
    const existing = await tx.contactMessage.count({ where: { contactRequestId: id } });
    if (existing === 0) {
      await tx.contactMessage.create({ data: { contactRequestId: id, sender: 'customer', body: contact.message, authorId: contact.userId ?? undefined, createdAt: contact.createdAt } });
      if (contact.adminReply) {
        await tx.contactMessage.create({ data: { contactRequestId: id, sender: 'staff', body: contact.adminReply, createdAt: contact.repliedAt ?? undefined } });
      }
    }

    const created = await tx.contactMessage.create({
      data: { contactRequestId: id, sender, body: parsed.data.body, authorId: auth.user.id },
      select: { id: true, sender: true, body: true, createdAt: true },
    });

    await tx.contactRequest.update({
      where: { id },
      data: isStaff
        ? { adminReply: parsed.data.body, repliedAt: new Date(), repliedById: auth.user.id }
        : { status: 'open' }, // a new customer message reopens the ticket
    });

    return created;
  });

  // Notify the guest by email when staff replies.
  if (isStaff && contact.email) {
    const { html, text } = renderBrandedMail({
      title: `Destek talebiniz yanıtlandı — ${contact.ticketId}`,
      preview: 'Kütahya Garden Otel destek ekibi mesajınıza yanıt verdi.',
      intro: `Merhaba ${contact.name}, ${contact.ticketId} numaralı talebinize yanıt geldi.`,
      lines: [`Yanıt: ${parsed.data.body}`, 'Hesabınızdaki Destek bölümünden konuşmayı sürdürebilirsiniz.'],
    });
    sendMail({ to: contact.email, subject: `Destek talebiniz yanıtlandı — ${contact.ticketId}`, html, text }).catch(console.error);
  }

  return NextResponse.json({ ok: true, message }, { status: 201 });
}
