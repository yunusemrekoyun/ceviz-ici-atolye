'use server';

import { updateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guards';
import { TAGS } from '@/lib/cache-tags';
import { formatPricePerM2, parsePrice } from '@/lib/format';
import {
  notifyOwnerApproved,
  notifyOwnerPriceApplied,
  notifyOwnerPriceRejected,
  notifyOwnerRejected,
} from '@/lib/notify';
import { actionError, actionOk, type ActionResult } from '@/lib/action-result';

/** Başvuru onayı: incelemede → cekimBekliyor; sahibine "çekim planlanıyor"
 * e-postası gider. Kaynak-durum where'de — çifte tıklama ikinci kez işlemez. */
export async function approveListing(listingId: string): Promise<ActionResult> {
  await requireAdmin();
  const result = await prisma.listing.updateMany({
    where: { id: listingId, status: 'incelemede' },
    data: { status: 'cekimBekliyor' },
  });
  if (result.count === 0) return actionError('Başvuru artık incelemede değil.');

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { title: true, owner: { select: { id: true, email: true } } },
  });
  if (listing) await notifyOwnerApproved(listing.owner, listing.title);
  return actionOk;
}

/** Başvuru reddi: incelemede → reddedildi + üyeye gösterilecek neden. */
export async function rejectListing(
  listingId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const reason = String(formData.get('reason') ?? '').trim();
  if (reason.length < 5) {
    return { ok: false, fieldErrors: { reason: ['Red nedenini yazın (en az 5 karakter).'] } };
  }

  const result = await prisma.listing.updateMany({
    where: { id: listingId, status: 'incelemede' },
    data: { status: 'reddedildi', rejectReason: reason },
  });
  if (result.count === 0) return actionError('Başvuru artık incelemede değil.');

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { title: true, owner: { select: { id: true, email: true } } },
  });
  if (listing) await notifyOwnerRejected(listing.owner, listing.title, reason);
  return actionOk;
}

/** Fiyat talebini uygular: ilan fiyatı + birim fiyat güncellenir, talep
 * kapanır, sahibine haber verilir, public cache düşürülür. */
export async function applyPriceRequest(requestId: string): Promise<ActionResult> {
  await requireAdmin();

  const request = await prisma.listingPriceRequest.findUnique({
    where: { id: requestId },
    include: {
      listing: {
        select: {
          id: true,
          slug: true,
          title: true,
          area: true,
          owner: { select: { id: true, email: true } },
        },
      },
    },
  });
  if (!request || request.status !== 'bekliyor') {
    return actionError('Talep bulunamadı ya da zaten sonuçlandı.');
  }

  const priceNum = parsePrice(request.requestedPrice);
  const areaNum = parsePrice(request.listing.area);

  await prisma.$transaction([
    prisma.listing.update({
      where: { id: request.listing.id },
      data: {
        price: request.requestedPrice,
        pricePerM2: formatPricePerM2(priceNum, areaNum),
        priceValue: BigInt(priceNum),
      },
    }),
    prisma.listingPriceRequest.update({
      where: { id: requestId },
      data: { status: 'uygulandi', resolvedAt: new Date() },
    }),
  ]);

  updateTag(TAGS.listings);
  updateTag(TAGS.listing(request.listing.slug));
  await notifyOwnerPriceApplied(
    request.listing.owner,
    request.listing.title,
    request.requestedPrice,
  );
  return actionOk;
}

export async function rejectPriceRequest(requestId: string): Promise<ActionResult> {
  await requireAdmin();

  const request = await prisma.listingPriceRequest.findUnique({
    where: { id: requestId },
    include: {
      listing: { select: { title: true, owner: { select: { id: true, email: true } } } },
    },
  });
  if (!request || request.status !== 'bekliyor') {
    return actionError('Talep bulunamadı ya da zaten sonuçlandı.');
  }

  await prisma.listingPriceRequest.update({
    where: { id: requestId },
    data: { status: 'reddedildi', resolvedAt: new Date() },
  });
  await notifyOwnerPriceRejected(request.listing.owner, request.listing.title);
  return actionOk;
}
