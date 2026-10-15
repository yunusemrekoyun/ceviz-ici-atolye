'use server';

import { updateTag } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guards';
import { TAGS } from '@/lib/cache-tags';
import { removeMediaFiles } from '@/lib/media-store';
import { actionError, actionOk, type ActionResult } from '@/lib/action-result';

async function invalidate(listingId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { slug: true },
  });
  updateTag(TAGS.listings);
  if (listing) updateTag(TAGS.listing(listing.slug));
}

/** Medya öğesini DB'den ve diskten siler; kalan görsellerin sırası sıkıştırılır. */
export async function deleteMediaItem(mediaId: string): Promise<ActionResult> {
  await requireAdmin();

  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) return actionError('Medya bulunamadı.');

  await prisma.$transaction(async (tx) => {
    await tx.media.delete({ where: { id: mediaId } });
    const rest = await tx.media.findMany({
      where: { listingId: media.listingId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, position: true },
    });
    for (const [i, m] of rest.entries()) {
      if (m.position !== i) {
        await tx.media.update({ where: { id: m.id }, data: { position: i } });
      }
    }
  });
  await removeMediaFiles(media.listingId, mediaId);
  await invalidate(media.listingId);
  return actionOk;
}

/** Görseli galeri sırasında bir adım öne/arkaya taşır (komşusuyla yer değiştirir). */
export async function moveMediaItem(
  mediaId: string,
  direction: 'up' | 'down',
): Promise<ActionResult> {
  await requireAdmin();

  const media = await prisma.media.findUnique({ where: { id: mediaId } });
  if (!media) return actionError('Medya bulunamadı.');

  // UI ok butonları yalnız yüklenen (/m/) görsellerde — komşuluk da o küme
  // içinde kurulmalı; araya harici URL satırı girerse sıra şaşmasın.
  const all = await prisma.media.findMany({
    where: { listingId: media.listingId, type: media.type },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, position: true, variants: true },
  });
  const siblings = all.filter((m) => {
    const url = ((m.variants as { url?: string }[] | null)?.[0]?.url ?? '').trim();
    return url === '' || url.startsWith('/m/');
  });
  const idx = siblings.findIndex((m) => m.id === mediaId);
  const swapWith = direction === 'up' ? siblings[idx - 1] : siblings[idx + 1];
  if (!swapWith) return actionOk; // zaten uçta

  await prisma.$transaction([
    prisma.media.update({
      where: { id: mediaId },
      data: { position: swapWith.position },
    }),
    prisma.media.update({
      where: { id: swapWith.id },
      data: { position: siblings[idx].position },
    }),
  ]);
  await invalidate(media.listingId);
  return actionOk;
}
