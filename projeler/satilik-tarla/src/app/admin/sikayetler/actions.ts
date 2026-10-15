'use server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guards';
import { actionError, actionOk, type ActionResult } from '@/lib/action-result';

export async function closeComplaint(complaintId: string): Promise<ActionResult> {
  await requireAdmin();
  const updated = await prisma.complaint.updateMany({
    where: { id: complaintId, status: 'acik' },
    data: { status: 'kapatildi', resolvedAt: new Date() },
  });
  return updated.count ? actionOk : actionError('Şikayet bulunamadı ya da zaten kapalı.');
}
