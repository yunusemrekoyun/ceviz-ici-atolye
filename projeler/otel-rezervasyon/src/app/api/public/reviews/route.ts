import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getGoogleReviewSummary, type PublicReviewItem } from '@/lib/reviews/google';

export const runtime = 'nodejs';

function displayName(firstName: string, lastName: string) {
  const first = firstName.trim();
  const initial = lastName.trim()[0];
  return initial ? `${first} ${initial}.` : first;
}

export async function GET() {
  try {
    const [google, internalRows] = await Promise.all([
      getGoogleReviewSummary(),
      prisma.hotelReview.findMany({
        where: { status: 'approved' },
        orderBy: [{ approvedAt: 'desc' }, { createdAt: 'desc' }],
        take: 12,
        include: {
          reservation: {
            select: {
              firstName: true,
              lastName: true,
              checkOutDate: true,
              room: { select: { roomType: { select: { name: true } } } },
            },
          },
        },
      }),
    ]);

    const internal: PublicReviewItem[] = internalRows.map((review) => ({
      id: review.id,
      source: 'internal',
      userName: displayName(review.reservation.firstName, review.reservation.lastName),
      rating: review.rating,
      comment: review.comment,
      date: review.createdAt.toISOString(),
      roomName: review.reservation.room.roomType.name,
    }));

    return NextResponse.json({
      ok: true,
      summary: google,
      reviews: [...internal, ...google.reviews].slice(0, 12),
    });
  } catch (error) {
    console.error('Public reviews fetch failed.', error);
    return NextResponse.json({ ok: false, message: 'Yorumlar yüklenemedi.' }, { status: 503 });
  }
}
