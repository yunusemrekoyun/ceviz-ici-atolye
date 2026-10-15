'use server';

import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guards';
import { actionError, actionOk, type ActionResult } from '@/lib/action-result';

const STATUSES = ['yeni', 'okundu', 'donuldu'] as const;
type LeadStatus = (typeof STATUSES)[number];

export async function setLeadStatus(leadId: string, status: string): Promise<ActionResult> {
  await requireAdmin();
  if (!STATUSES.includes(status as LeadStatus)) return actionError('Geçersiz durum.');
  const updated = await prisma.lead.updateMany({
    where: { id: leadId },
    data: { status: status as LeadStatus },
  });
  return updated.count ? actionOk : actionError('Talep bulunamadı.');
}

export async function deleteLead(leadId: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.lead.deleteMany({ where: { id: leadId } });
  return actionOk;
}
