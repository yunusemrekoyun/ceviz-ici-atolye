import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

const createSchema = z.object({
  reservationId: z.string().min(1).optional(),
  confirmationId: z.string().min(1).optional(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(1000),
});

function canOwnReservation(auth: { user: { id: string; email: string } }) {
  return {
    OR: [
      { userId: auth.user.id },
      { email: auth.user.email },
    ],
  };
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });
  if (auth.user.roleSlug !== 'musteri') {
    return NextResponse.json({ ok: false, message: 'Bu alan müşteri hesapları içindir.' }, { status: 403 });
  }

  const reservations = await prisma.reservation.findMany({
    where: {
      status: 'checked_out',
      ...canOwnReservation(auth),
    },
    include: {
      room: { select: { name: true, roomType: { select: { name: true } } } },
      hotelReview: true,
    },
    orderBy: { checkOutDate: 'desc' },
  });

  return NextResponse.json({
    ok: true,
    items: reservations.map((reservation) => ({
      reservation: {
        id: reservation.id,
        confirmationId: reservation.confirmationId,
        roomName: reservation.room.name,
        roomTypeName: reservation.room.roomType.name,
        checkInDate: reservation.checkInDate.toISOString(),
        checkOutDate: reservation.checkOutDate.toISOString(),
      },
      review: reservation.hotelReview ? {
        id: reservation.hotelReview.id,
        rating: reservation.hotelReview.rating,
        comment: reservation.hotelReview.comment,
        status: reservation.hotelReview.status,
        createdAt: reservation.hotelReview.createdAt.toISOString(),
        approvedAt: reservation.hotelReview.approvedAt?.toISOString() ?? null,
      } : null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });
  if (auth.user.roleSlug !== 'musteri') {
    return NextResponse.json({ ok: false, message: 'Bu alan müşteri hesapları içindir.' }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: 'Yorum bilgileri geçersiz.', errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  if (!parsed.data.reservationId && !parsed.data.confirmationId) {
    return NextResponse.json({ ok: false, message: 'Rezervasyon seçimi zorunludur.' }, { status: 400 });
  }

  const reservation = await prisma.reservation.findFirst({
    where: {
      ...(parsed.data.reservationId
        ? { id: parsed.data.reservationId }
        : { confirmationId: parsed.data.confirmationId }),
      ...canOwnReservation(auth),
    },
    select: {
      id: true,
      confirmationId: true,
      status: true,
      hotelReview: { select: { id: true } },
    },
  });

  if (!reservation) {
    return NextResponse.json({ ok: false, message: 'Rezervasyon bulunamadı.' }, { status: 404 });
  }

  if (reservation.status !== 'checked_out') {
    return NextResponse.json({ ok: false, message: 'Yorum bırakmak için konaklamanın tamamlanmış olması gerekir.' }, { status: 409 });
  }

  if (reservation.hotelReview) {
    return NextResponse.json({ ok: false, message: 'Bu rezervasyon için daha önce yorum bırakılmış.' }, { status: 409 });
  }

  try {
    const review = await prisma.hotelReview.create({
      data: {
        reservationId: reservation.id,
        userId: auth.user.id,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
        status: 'pending',
        source: 'internal',
      },
    });

    await writeAuditLog({
      request,
      auth,
      action: 'review.create',
      entityType: 'hotel_review',
      entityId: review.id,
      summary: `Müşteri yorumu oluşturuldu: #${reservation.confirmationId}`,
      after: {
        reservationId: reservation.id,
        rating: review.rating,
        status: review.status,
      },
    });

    return NextResponse.json({
      ok: true,
      review: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        status: review.status,
        createdAt: review.createdAt.toISOString(),
        approvedAt: null,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ ok: false, message: 'Bu rezervasyon için daha önce yorum bırakılmış.' }, { status: 409 });
    }

    console.error('Review create failed.', error);
    return NextResponse.json({ ok: false, message: 'Yorum kaydedilemedi.' }, { status: 503 });
  }
}
