'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { redisConnection } from '@/lib/redis';
import { requireUser } from '@/lib/auth-guards';
import { getServerSession } from '@/lib/get-session';
import { pushNotification } from '@/lib/notifications';
import { notifyNewMessage } from '@/lib/notify';
import { actionError, actionOk, type ActionResult } from '@/lib/action-result';

const MESSAGE_MAX = 2000;
const RATE_LIMIT_PER_HOUR = 30;

/** Redis hız limiti — Redis düşükse akışı engelleme (lead formuyla aynı ilke). */
async function overRateLimit(userId: string): Promise<boolean> {
  try {
    const key = `msg:rl:${userId}`;
    const count = await redisConnection.incr(key);
    if (count === 1) await redisConnection.expire(key, 3600);
    return count > RATE_LIMIT_PER_HOUR;
  } catch {
    return false;
  }
}

/** İlan detayındaki "Mesaj Gönder" — aynı (ilan, alıcı) için tek sohbet:
 * varsa açılır, yoksa oluşturulur; her iki durumda da sohbete yönlenir. */
export async function startConversation(slug: string): Promise<ActionResult> {
  const session = await getServerSession();
  if (!session) redirect(`/giris?callbackURL=/ilan/${slug}`);

  const listing = await prisma.listing.findUnique({
    where: { slug },
    select: { id: true, ownerId: true, status: true },
  });
  if (!listing || listing.status !== 'aktif') {
    return actionError('İlan bulunamadı.');
  }
  if (listing.ownerId === session.user.id) {
    return actionError('Kendi ilanınıza mesaj gönderemezsiniz.');
  }

  const existing = await prisma.conversation.findFirst({
    where: { listingId: listing.id, buyerId: session.user.id },
    select: { id: true },
  });
  const conversation =
    existing ??
    (await prisma.conversation.create({
      data: {
        listingId: listing.id,
        buyerId: session.user.id,
        sellerId: listing.ownerId,
      },
      select: { id: true },
    }));

  redirect(`/hesap/mesajlar/${conversation.id}`);
}

export async function sendMessage(
  conversationId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireUser();
  const body = String(formData.get('body') ?? '').trim();
  if (!body) return { ok: false, fieldErrors: { body: ['Mesaj boş olamaz.'] } };
  if (body.length > MESSAGE_MAX) {
    return { ok: false, fieldErrors: { body: [`Mesaj en fazla ${MESSAGE_MAX} karakter.`] } };
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      listing: { select: { title: true, slug: true } },
      _count: { select: { messages: true } },
    },
  });
  if (
    !conversation ||
    (conversation.buyerId !== session.user.id && conversation.sellerId !== session.user.id)
  ) {
    return actionError('Sohbet bulunamadı.');
  }

  if (await overRateLimit(session.user.id)) {
    return actionError('Çok sık mesaj gönderdiniz — biraz sonra tekrar deneyin.');
  }

  await prisma.message.create({
    data: { conversationId, senderId: session.user.id, body },
  });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  const recipientId =
    conversation.buyerId === session.user.id ? conversation.sellerId : conversation.buyerId;
  const listingTitle = conversation.listing?.title ?? 'İlan';

  await pushNotification(recipientId, {
    title: `Yeni mesaj — ${session.user.name}`,
    body: body.slice(0, 120),
    href: `/hesap/mesajlar/${conversationId}`,
  });

  // E-posta yalnız sohbetin İLK mesajında — her mesajda posta kutusu dolmasın;
  // devamı zil bildirimiyle akar.
  if (conversation._count.messages === 0) {
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true },
    });
    if (recipient) {
      await notifyNewMessage(
        recipient.email,
        session.user.name,
        listingTitle,
        `/hesap/mesajlar/${conversationId}`,
      );
    }
  }

  return actionOk;
}
