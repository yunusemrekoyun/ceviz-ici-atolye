import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';

export const runtime = 'nodejs';

export const DEFAULT_CUTOFF_HOURS = 48;
export const DEFAULT_REFUND_RATE = 100;

export async function GET() {
  const [cutoff, rate] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: 'cancel_cutoff_hours' } }),
    prisma.systemSetting.findUnique({ where: { key: 'refund_rate_percent' } }),
  ]);

  return NextResponse.json({
    ok: true,
    cancelCutoffHours: cutoff ? Number(cutoff.value) : DEFAULT_CUTOFF_HOURS,
    refundRatePercent: rate ? Number(rate.value) : DEFAULT_REFUND_RATE,
  });
}

const schema = z.object({
  cancelCutoffHours: z.coerce.number().int().min(0).max(720),
  refundRatePercent: z.coerce.number().int().min(0).max(100),
});

export async function POST(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || auth.user.roleSlug !== 'admin') {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Geçersiz değer.' }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.systemSetting.upsert({
      where: { key: 'cancel_cutoff_hours' },
      update: { value: String(parsed.data.cancelCutoffHours) },
      create: { key: 'cancel_cutoff_hours', value: String(parsed.data.cancelCutoffHours) },
    }),
    prisma.systemSetting.upsert({
      where: { key: 'refund_rate_percent' },
      update: { value: String(parsed.data.refundRatePercent) },
      create: { key: 'refund_rate_percent', value: String(parsed.data.refundRatePercent) },
    }),
  ]);

  return NextResponse.json({ ok: true, ...parsed.data });
}
