import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';

export const runtime = 'nodejs';

const patchSchema = z.object({
  notifyReservationEmail: z.boolean().optional(),
  notifyCheckinEmail:     z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });

  const prefs = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { notifyReservationEmail: true, notifyCheckinEmail: true },
  });
  return NextResponse.json({ ok: true, prefs });
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const prefs = await prisma.user.update({
    where: { id: auth.user.id },
    data: parsed.data,
    select: { notifyReservationEmail: true, notifyCheckinEmail: true },
  });
  return NextResponse.json({ ok: true, prefs });
}
