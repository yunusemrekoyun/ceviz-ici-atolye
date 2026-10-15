'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/get-session';

export type FavoriteResult = { ok: boolean; favored?: boolean; error?: string };

/** Kalp butonu — oturum yoksa client login'e yönlendirir (guest: false döner). */
export async function toggleFavorite(slug: string): Promise<FavoriteResult> {
  const session = await getServerSession();
  if (!session) return { ok: false, error: 'GIRIS' };

  const listing = await prisma.listing.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!listing) return { ok: false, error: 'İlan bulunamadı.' };

  const existing = await prisma.favorite.findUnique({
    where: { userId_listingId: { userId: session.user.id, listingId: listing.id } },
    select: { id: true },
  });
  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return { ok: true, favored: false };
  }
  await prisma.favorite.create({
    data: { userId: session.user.id, listingId: listing.id },
  });
  return { ok: true, favored: true };
}
