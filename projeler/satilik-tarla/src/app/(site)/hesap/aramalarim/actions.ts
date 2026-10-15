'use server';

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-guards';
import { actionError, actionOk, type ActionResult } from '@/lib/action-result';

const ALLOWED_KEYS = [
  'ilce',
  'tur',
  'q',
  'imar',
  'tapu',
  'yol',
  'su',
  'elektrik',
  'minFiyat',
  'maxFiyat',
  'minAlan',
  'maxAlan',
];
const MAX_SAVED = 10;

/** /ilanlar'daki aktif filtreleri kayıtlı aramaya çevirir — her sabah 08:00'de
 * yeni eşleşme varsa özet e-postası gider (v0.5 kararı). */
export async function saveSearch(
  params: Record<string, string>,
  name: string,
): Promise<ActionResult> {
  const session = await requireUser();

  const clean: Record<string, string> = {};
  for (const k of ALLOWED_KEYS) {
    const v = params[k];
    if (typeof v === 'string' && v.trim()) clean[k] = v.trim().slice(0, 80);
  }
  if (Object.keys(clean).length === 0) {
    return actionError('Kaydetmek için önce en az bir filtre seçin.');
  }

  const count = await prisma.savedSearch.count({ where: { userId: session.user.id } });
  if (count >= MAX_SAVED) {
    return actionError(`En fazla ${MAX_SAVED} kayıtlı arama tutabilirsiniz.`);
  }

  const existing = await prisma.savedSearch.findFirst({
    where: { userId: session.user.id, params: { equals: clean } },
    select: { id: true },
  });
  if (existing) return actionError('Bu arama zaten kayıtlı.');

  await prisma.savedSearch.create({
    data: {
      userId: session.user.id,
      name: name.trim().slice(0, 80) || 'Kayıtlı arama',
      params: clean,
    },
  });
  return actionOk;
}

export async function deleteSavedSearch(id: string): Promise<ActionResult> {
  const session = await requireUser();
  const deleted = await prisma.savedSearch.deleteMany({
    where: { id, userId: session.user.id },
  });
  return deleted.count ? actionOk : actionError('Kayıt bulunamadı.');
}
