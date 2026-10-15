import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

const patchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(['approve', 'reject', 'reset']),
});

function serializeReview(review: Awaited<ReturnType<typeof findReviewById>>) {
  if (!review) return null;
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    status: review.status,
    source: review.source,
    createdAt: review.createdAt.toISOString(),
    approvedAt: review.approvedAt?.toISOString() ?? null,
    user: {
      id: review.user.id,
      email: review.user.email,
      firstName: review.user.firstName,
      lastName: review.user.lastName,
    },
    reservation: {
      id: review.reservation.id,
      confirmationId: review.reservation.confirmationId,
      firstName: review.reservation.firstName,
      lastName: review.reservation.lastName,
      email: review.reservation.email,
      checkInDate: review.reservation.checkInDate.toISOString(),
      checkOutDate: review.reservation.checkOutDate.toISOString(),
      roomName: review.reservation.room.name,
      roomTypeName: review.reservation.room.roomType.name,
    },
  };
}

async function findReviewById(id: string) {
  return prisma.hotelReview.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      reservation: {
        select: {
          id: true,
          confirmationId: true,
          firstName: true,
          lastName: true,
          email: true,
          checkInDate: true,
          checkOutDate: true,
          room: { select: { name: true, roomType: { select: { name: true } } } },
        },
      },
    },
  });
}

export async function GET(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });
  if (auth.user.roleSlug !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }

  const status = request.nextUrl.searchParams.get('status');
  const where = status && ['pending', 'approved', 'rejected'].includes(status)
    ? { status }
    : {};

  const reviews = await prisma.hotelReview.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      reservation: {
        select: {
          id: true,
          confirmationId: true,
          firstName: true,
          lastName: true,
          email: true,
          checkInDate: true,
          checkOutDate: true,
          room: { select: { name: true, roomType: { select: { name: true } } } },
        },
      },
    },
  });

  return NextResponse.json({ ok: true, reviews: reviews.map(serializeReview) });
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });
  if (auth.user.roleSlug !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Geçersiz istek.' }, { status: 400 });
  }

  const before = await findReviewById(parsed.data.id);
  if (!before) {
    return NextResponse.json({ ok: false, message: 'Yorum bulunamadı.' }, { status: 404 });
  }

  const status = parsed.data.action === 'approve'
    ? 'approved'
    : parsed.data.action === 'reject'
      ? 'rejected'
      : 'pending';

  const updated = await prisma.hotelReview.update({
    where: { id: parsed.data.id },
    data: {
      status,
      approvedAt: status === 'approved' ? new Date() : null,
      moderatedById: status === 'pending' ? null : auth.user.id,
    },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      reservation: {
        select: {
          id: true,
          confirmationId: true,
          firstName: true,
          lastName: true,
          email: true,
          checkInDate: true,
          checkOutDate: true,
          room: { select: { name: true, roomType: { select: { name: true } } } },
        },
      },
    },
  });

  await writeAuditLog({
    request,
    auth,
    action: parsed.data.action === 'approve'
      ? 'review.approve'
      : parsed.data.action === 'reject'
        ? 'review.reject'
        : 'review.reset',
    entityType: 'hotel_review',
    entityId: updated.id,
    summary: `Yorum durumu güncellendi: ${updated.status}`,
    before: { status: before.status },
    after: { status: updated.status, reservationId: updated.reservationId },
  });

  return NextResponse.json({ ok: true, review: serializeReview(updated) });
}
