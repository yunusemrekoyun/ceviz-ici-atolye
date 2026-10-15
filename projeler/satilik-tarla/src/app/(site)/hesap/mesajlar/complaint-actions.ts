'use server';

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-guards';
import { notifyComplaintAdmin } from '@/lib/notify';
import { actionError, actionOk, type ActionResult } from '@/lib/action-result';

/** Görüşme şikayeti — admin yazışmayı göremez; yalnızca gerekçe + ekran
 * görüntüleri iletilir (v0.5 kararı). */
export async function submitComplaint(
  conversationId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireUser();

  const reason = String(formData.get('reason') ?? '').trim();
  if (reason.length < 10) {
    return {
      ok: false,
      fieldErrors: {
        reason: ['Şikayet gerekçesini biraz daha ayrıntılı yazın (en az 10 karakter).'],
      },
    };
  }

  let images: string[] = [];
  try {
    images = JSON.parse(String(formData.get('images') ?? '[]'));
  } catch {
    images = [];
  }
  images = images.filter((u) => typeof u === 'string' && u.startsWith('/m/sikayet/')).slice(0, 3);

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { buyerId: true, sellerId: true, listingId: true },
  });
  if (
    !conversation ||
    (conversation.buyerId !== session.user.id && conversation.sellerId !== session.user.id)
  ) {
    return actionError('Sohbet bulunamadı.');
  }

  const open = await prisma.complaint.count({
    where: { reporterId: session.user.id, conversationId, status: 'acik' },
  });
  if (open > 0) {
    return actionError('Bu görüşme için açık bir şikayetiniz zaten var.');
  }

  await prisma.complaint.create({
    data: {
      reporterId: session.user.id,
      conversationId,
      listingId: conversation.listingId,
      reason: reason.slice(0, 3000),
      images,
    },
  });
  await notifyComplaintAdmin(session.user.name, reason);
  return actionOk;
}
