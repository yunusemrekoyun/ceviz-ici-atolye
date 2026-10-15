'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guards';
import { actionError, actionOk, type ActionResult } from '@/lib/action-result';

/** Üye engelleme — better-auth admin API'siyle: oturumları da düşürür. */
export async function banMember(userId: string, reason: string): Promise<ActionResult> {
  const session = await requireAdmin();
  if (userId === session.user.id) return actionError('Kendinizi engelleyemezsiniz.');

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!target) return actionError('Üye bulunamadı.');
  if (target.role === 'admin') return actionError('Yönetici hesabı engellenemez.');

  await auth.api.banUser({
    body: { userId, banReason: reason.trim().slice(0, 300) || undefined },
    headers: await headers(),
  });
  return actionOk;
}

export async function unbanMember(userId: string): Promise<ActionResult> {
  await requireAdmin();
  await auth.api.unbanUser({ body: { userId }, headers: await headers() });
  return actionOk;
}
