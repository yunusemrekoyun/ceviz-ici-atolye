'use server';

import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { redisConnection } from '@/lib/redis';
import { notifyLeadAdmin, notifyLeadConfirm } from '@/lib/notify';
import { actionOk, zodToActionResult, type ActionResult } from '@/lib/action-result';
import { leadSchema } from './lead-schema';

const RATE_LIMIT_PER_HOUR = 5;

async function overRateLimit(): Promise<boolean> {
  try {
    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
    const key = `lead:rl:${ip}`;
    const count = await redisConnection.incr(key);
    if (count === 1) await redisConnection.expire(key, 3600);
    return count > RATE_LIMIT_PER_HOUR;
  } catch {
    // Redis erişilemezse limit atlanır — lead kaybolmasın
    return false;
  }
}

export async function createLead(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  // Anti-spam 1: honeypot — botların doldurduğu gizli alan
  if (String(formData.get('website') ?? '').trim() !== '') {
    return actionOk; // sessizce "başarılı"
  }
  // Anti-spam 2: form render zaman damgası — insan hızı penceresi
  const ts = Number(formData.get('ts') ?? 0);
  const elapsed = Date.now() - ts;
  if (!ts || elapsed < 3000 || elapsed > 60 * 60 * 1000) {
    return actionOk;
  }
  // Anti-spam 3: IP başına saatlik limit
  if (await overRateLimit()) {
    return {
      ok: false,
      error: 'Kısa sürede çok fazla talep gönderildi. Lütfen daha sonra tekrar deneyin.',
    };
  }

  const parsed = leadSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    email: formData.get('email') ?? '',
    budget: formData.get('budget') ?? '',
    district: formData.get('district') ?? '',
    purpose: formData.get('purpose') ?? '',
    note: formData.get('note') ?? '',
    kvkkConsent: formData.get('kvkkConsent') === 'on',
  });
  if (!parsed.success) return zodToActionResult(parsed.error);

  const d = parsed.data;
  await prisma.lead.create({
    data: {
      name: d.name,
      phone: d.phone,
      email: d.email || null,
      budget: d.budget || null,
      district: d.district || null,
      purpose: d.purpose || null,
      note: d.note || null,
      kvkkConsent: true,
    },
  });

  // E-postalar kuyruğa (hata lead'i düşürmez — notify içinde try/catch)
  await notifyLeadAdmin({
    name: d.name,
    phone: d.phone,
    email: d.email || undefined,
    budget: d.budget || undefined,
    district: d.district || undefined,
    purpose: d.purpose || undefined,
    note: d.note || undefined,
  });
  if (d.email) await notifyLeadConfirm(d.email, d.name);

  return actionOk;
}
