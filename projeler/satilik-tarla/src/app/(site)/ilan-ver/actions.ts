'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-guards';
import { uniqueListingSlug } from '@/lib/slugify';
import { TYPE_MAP, PURPOSE_LABELS } from '@/lib/mappers';
import { formatArea, formatPricePerM2, formatTRY, inLocative } from '@/lib/format';
import { notifyAdminNewApplication } from '@/lib/notify';
import { zodToActionResult, type ActionResult } from '@/lib/action-result';
import { listingApplicationSchema } from './schema';

/** Üye ilan başvurusu: temel bilgiler girilir (görsel ve arazi bilgileri
 * GİRİLMEZ — ekip sahada doğrular, admin çekim aşamasında ekler).
 * Başvuru doğrudan 'incelemede' durumuyla açılır. */
export async function createListingApplication(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireUser();
  // Savunma katmanı: better-auth requireEmailVerification zaten doğrulanmamış
  // girişe izin vermez; yine de açıkça kontrol ediyoruz.
  if (!session.user.emailVerified) {
    return { ok: false, error: 'Başvuru için e-posta adresinizi doğrulamanız gerekir.' };
  }

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
  const slug = await uniqueListingSlug(title);

  await prisma.listing.create({
    data: {
      ownerId: session.user.id,
      slug,
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
      specs: [],
      tags: [],
      highlights: [],
    },
  });

  await notifyAdminNewApplication(title, d.district);
  redirect('/hesap/ilanlarim?basvuru=alindi');
}
