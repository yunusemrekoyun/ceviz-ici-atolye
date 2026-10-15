import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || !['admin', 'personel'].includes(auth.user.roleSlug)) {
    return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const year  = parseInt(searchParams.get('year')  ?? '', 10);
  const month = parseInt(searchParams.get('month') ?? '', 10); // 0-based
  const roomId = searchParams.get('roomId') ?? undefined;

  if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
    return NextResponse.json({ ok: false, message: 'Invalid year/month.' }, { status: 400 });
  }

  // Full month window
  const monthStart = new Date(year, month, 1);
  const monthEnd   = new Date(year, month + 1, 0, 23, 59, 59);

  try {
    const [reservations, allRooms] = await Promise.all([
      prisma.reservation.findMany({
        where: {
          status: { notIn: ['cancelled'] },
          NOT: {
            status: 'payment_pending',
            paymentExpiresAt: { lte: new Date() },
          },
          checkInDate:  { lt: monthEnd },
          checkOutDate: { gt: monthStart },
          ...(roomId ? { roomId } : {}),
        },
        select: {
          checkInDate:  true,
          checkOutDate: true,
          room: { select: { id: true, name: true } },
        },
      }),
      prisma.room.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const ranges = reservations.map(r => ({
      checkIn:  r.checkInDate.toISOString().split('T')[0],
      checkOut: r.checkOutDate.toISOString().split('T')[0],
      roomId:   r.room.id,
      roomName: r.room.name,
    }));

    return NextResponse.json({ ok: true, ranges, allRooms, totalRooms: allRooms.length });
  } catch (error) {
    console.error('Availability fetch failed.', error);
    return NextResponse.json({ ok: false, message: 'Veri alınamadı.' }, { status: 503 });
  }
}
