import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';

export const runtime = 'nodejs';

const DEFAULT_CHECKIN_TIME  = '14:00';
const DEFAULT_CHECKOUT_TIME = '12:00';

export async function GET() {
  const [ciRow, coRow] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: 'check_in_time' } }),
    prisma.systemSetting.findUnique({ where: { key: 'check_out_time' } }),
  ]);

  return NextResponse.json({
    ok: true,
    checkInTime:  ciRow?.value  ?? DEFAULT_CHECKIN_TIME,
    checkOutTime: coRow?.value  ?? DEFAULT_CHECKOUT_TIME,
  });
}

const schema = z.object({
  checkInTime:  z.string().regex(/^\d{2}:\d{2}$/),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function POST(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || auth.user.roleSlug !== 'admin') {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Geçersiz saat formatı.' }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.systemSetting.upsert({
      where:  { key: 'check_in_time' },
      update: { value: parsed.data.checkInTime },
      create: { key: 'check_in_time', value: parsed.data.checkInTime },
    }),
    prisma.systemSetting.upsert({
      where:  { key: 'check_out_time' },
      update: { value: parsed.data.checkOutTime },
      create: { key: 'check_out_time', value: parsed.data.checkOutTime },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    checkInTime:  parsed.data.checkInTime,
    checkOutTime: parsed.data.checkOutTime,
  });
}
