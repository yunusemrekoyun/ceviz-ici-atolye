import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function GET() {
  const row = await prisma.systemSetting.findUnique({ where: { key: 'loyalty_enabled' } });
  return NextResponse.json({ ok: true, enabled: row?.value === 'true' });
}

const schema = z.object({ enabled: z.boolean() });

export async function POST(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || auth.user.roleSlug !== 'admin') {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Geçersiz değer.' }, { status: 400 });
  }
  await prisma.systemSetting.upsert({
    where: { key: 'loyalty_enabled' },
    update: { value: String(parsed.data.enabled) },
    create: { key: 'loyalty_enabled', value: String(parsed.data.enabled) },
  });
  return NextResponse.json({ ok: true, enabled: parsed.data.enabled });
}
