import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

const guestSchema = z.object({
  isChild: z.boolean().default(false),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  birthDate: z.string().optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  nationality: z.string().max(3).optional().nullable(),
  tcKimlikNo: z.string().optional().nullable(),
  passportNo: z.string().optional().nullable(),
});

const putSchema = z.object({
  guests: z.array(guestSchema).max(20),
});

function parseDateOnly(value?: string | null) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || !['admin', 'personel'].includes(auth.user.roleSlug)) {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }

  const { id } = await params;
  const guests = await prisma.reservationGuest.findMany({
    where: { reservationId: id },
    orderBy: [{ isChild: 'asc' }, { createdAt: 'asc' }],
  });

  // KVKK trail: full identity numbers are served here (check-in verification).
  // Record who accessed which reservation's guest identities, when.
  if (guests.some((g) => g.tcKimlikNo || g.passportNo)) {
    await writeAuditLog({
      request,
      auth,
      action: 'reservation.guests_identity_access',
      entityType: 'reservation',
      entityId: id,
      summary: `Misafir kimlik bilgileri görüntülendi (${guests.length} kişi)`,
    }).catch(() => undefined);
  }

  return NextResponse.json({ ok: true, guests });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || !['admin', 'personel'].includes(auth.user.roleSlug)) {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }

  const { id } = await params;
  const reservation = await prisma.reservation.findUnique({ where: { id }, select: { id: true } });
  if (!reservation) {
    return NextResponse.json({ ok: false, message: 'Rezervasyon bulunamadı.' }, { status: 404 });
  }

  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Misafir bilgileri geçersiz.' }, { status: 400 });
  }

  // Field-level validation per guest type.
  for (const g of parsed.data.guests) {
    if (g.tcKimlikNo && !/^\d{11}$/.test(g.tcKimlikNo)) {
      return NextResponse.json({ ok: false, message: 'T.C. kimlik no 11 haneli olmalı.' }, { status: 400 });
    }
  }

  const guests = await prisma.$transaction(async (tx) => {
    await tx.reservationGuest.deleteMany({ where: { reservationId: id } });
    if (parsed.data.guests.length > 0) {
      await tx.reservationGuest.createMany({
        data: parsed.data.guests.map((g) => ({
          reservationId: id,
          isChild: g.isChild,
          firstName: g.firstName,
          lastName: g.lastName,
          birthDate: parseDateOnly(g.birthDate),
          gender: g.gender || null,
          nationality: g.nationality || 'TR',
          tcKimlikNo: g.tcKimlikNo || null,
          passportNo: g.passportNo || null,
        })),
      });
    }
    return tx.reservationGuest.findMany({ where: { reservationId: id }, orderBy: [{ isChild: 'asc' }, { createdAt: 'asc' }] });
  });

  await writeAuditLog({
    request,
    auth,
    action: 'reservation.guests_update',
    entityType: 'reservation',
    entityId: id,
    summary: `Ek misafir bilgileri güncellendi (${guests.length} kişi)`,
  });

  return NextResponse.json({ ok: true, guests });
}
