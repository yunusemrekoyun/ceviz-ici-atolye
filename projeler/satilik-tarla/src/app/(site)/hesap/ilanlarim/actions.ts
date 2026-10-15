'use server';

import { redirect } from 'next/navigation';
import { updateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-guards';
import { TAGS } from '@/lib/cache-tags';
import { TYPE_MAP, PURPOSE_LABELS } from '@/lib/mappers';
import { formatArea, formatPricePerM2, formatTRY, inLocative, parsePrice } from '@/lib/format';
import { notifyAdminPriceRequest, notifyAdminResubmission } from '@/lib/notify';
import { actionError, actionOk, zodToActionResult, type ActionResult } from '@/lib/action-result';
import { listingApplicationSchema } from '../../ilan-ver/schema';

/** Üye durum geçişleri — beyaz liste: aktif→satildi/kiralandi/pasif, pasif→aktif.
 * Sahiplik + kaynak-durum tek updateMany where'inde (TOCTOU kapalı). */
export async function setMyListingStatus(
  listingId: string,
  target: 'satildi' | 'kiralandi' | 'pasif' | 'aktif',
): Promise<ActionResult> {
  const session = await requireUser();
  const allowedFrom: Record<string, ('aktif' | 'pasif')[]> = {
    satildi: ['aktif'],
    kiralandi: ['aktif'],
    pasif: ['aktif'],
    aktif: ['pasif'],
  };
  const from = allowedFrom[target];
  if (!from) return actionError('Geçersiz durum.');

  // Yeniden yayına dönüş, admin'in yayın şartlarını (görsel+koordinat+yapısal
  // alanlar) taşımaya devam etmeli — eksikse ekip tamamlamalı.
  if (target === 'aktif') {
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, ownerId: session.user.id },
      select: {
        lat: true,
        lng: true,
        imarDurumu: true,
        tapuDurumu: true,
        yolDurumu: true,
        _count: { select: { media: { where: { type: 'image' } } } },
      },
    });
    if (
      !listing ||
      listing.lat == null ||
      listing.lng == null ||
      !listing.imarDurumu ||
      !listing.tapuDurumu ||
      !listing.yolDurumu ||
      listing._count.media === 0
    ) {
      return actionError(
        'İlan bilgileri yayına dönüş için eksik görünüyor — lütfen bizimle iletişime geçin.',
      );
    }
  }

  const result = await prisma.listing.updateMany({
    where: { id: listingId, ownerId: session.user.id, status: { in: from } },
    data: { status: target },
  });
  if (result.count === 0) {
    return actionError('Bu işlem şu an yapılamıyor.');
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { slug: true },
  });
  // aktif<->pasif/satıldı public görünürlüğü değiştirir
  updateTag(TAGS.listings);
  if (listing) updateTag(TAGS.listing(listing.slug));
  return actionOk;
}

/** Yayındaki ilan için fiyat güncelleme talebi — admin uygular/reddeder. */
export async function requestPriceUpdate(
  listingId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireUser();
  const requested = parsePrice(String(formData.get('requestedPrice') ?? ''));
  if (!requested || requested <= 0) {
    return { ok: false, fieldErrors: { requestedPrice: ['Geçerli bir fiyat girin.'] } };
  }
  const note =
    String(formData.get('note') ?? '')
      .trim()
      .slice(0, 500) || null;

  const listing = await prisma.listing.findFirst({
    where: { id: listingId, ownerId: session.user.id, status: 'aktif' },
    select: {
      id: true,
      title: true,
      priceRequests: { where: { status: 'bekliyor' }, select: { id: true } },
    },
  });
  if (!listing) return actionError('Bu ilan için talep oluşturulamıyor.');
  if (listing.priceRequests.length > 0) {
    return actionError('Bekleyen bir fiyat talebiniz zaten var.');
  }

  const requestedPrice = formatTRY(requested);
  await prisma.listingPriceRequest.create({
    data: { listingId: listing.id, requestedPrice, note },
  });
  await notifyAdminPriceRequest(listing.title, requestedPrice);
  return actionOk;
}

/** Reddedilen başvurunun düzeltilip yeniden gönderimi — AYNI kayıt
 * incelemede'ye döner (slug/id korunur), rejectReason temizlenir. */
export async function resubmitListing(
  listingId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireUser();

  const parsed = listingApplicationSchema.safeParse({
    title: formData.get('title') ?? '',
    district: formData.get('district'),
    location: formData.get('location'),
    type: formData.get('type'),
    purpose: formData.get('purpose'),
    areaM2: formData.get('areaM2'),
    priceTRY: formData.get('priceTRY'),
    description: formData.get('description'),
    droneRequested: formData.get('droneRequested') === 'on',
  });
  if (!parsed.success) return zodToActionResult(parsed.error);

  const d = parsed.data;
  const title =
    d.title?.trim() || `${inLocative(d.district)} ${PURPOSE_LABELS[d.purpose]} ${d.type}`;

  const result = await prisma.listing.updateMany({
    where: { id: listingId, ownerId: session.user.id, status: 'reddedildi' },
    data: {
      title,
      purpose: d.purpose,
      type: TYPE_MAP[d.type],
      location: d.location,
      district: d.district,
      area: formatArea(d.areaM2),
      price: formatTRY(d.priceTRY),
      pricePerM2: formatPricePerM2(d.priceTRY, d.areaM2),
      priceValue: BigInt(d.priceTRY),
      areaM2: d.areaM2,
      description: d.description,
      droneRequested: d.droneRequested,
      status: 'incelemede',
      rejectReason: null,
    },
  });
  if (result.count === 0) {
    return actionError('Yalnızca reddedilmiş başvurular yeniden gönderilebilir.');
  }

  await notifyAdminResubmission(title);
  redirect('/hesap/ilanlarim?basvuru=guncellendi');
}
