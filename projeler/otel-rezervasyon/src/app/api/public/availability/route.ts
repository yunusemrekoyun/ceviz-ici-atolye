import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = Number.parseInt(searchParams.get('year') ?? '', 10);
  const month = Number.parseInt(searchParams.get('month') ?? '', 10);
  const roomTypeId = searchParams.get('roomTypeId');

  if (Number.isNaN(year) || Number.isNaN(month) || month < 0 || month > 11) {
    return NextResponse.json({ ok: false, message: 'Invalid year/month.' }, { status: 400 });
  }

  try {
    if (roomTypeId && !(await prisma.roomType.findFirst({
      where: { id: roomTypeId, isActive: true },
      select: { id: true },
    }))) {
      return NextResponse.json({ ok: false, message: 'Oda tipi bulunamadı.' }, { status: 404 });
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthStart = new Date(Date.UTC(year, month, 1));
    const monthEnd = new Date(Date.UTC(year, month + 1, 1));
    const today = new Date();
    const todayKey = dateKey(today);

    const rooms = await prisma.room.findMany({
      where: {
        isActive: true,
        roomType: { isActive: true },
        ...(roomTypeId ? { roomTypeId } : {}),
      },
      select: { id: true, status: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const reservations = rooms.length > 0
      ? await prisma.reservation.findMany({
          where: {
            roomId: { in: rooms.map((room) => room.id) },
            status: { notIn: ['cancelled'] },
            NOT: {
              status: 'payment_pending',
              paymentExpiresAt: { lte: new Date() },
            },
            checkInDate: { lt: monthEnd },
            checkOutDate: { gt: monthStart },
          },
          select: {
            roomId: true,
            checkInDate: true,
            checkOutDate: true,
          },
        })
      : [];

    const reservationsByRoom = reservations.reduce<Record<string, typeof reservations>>((acc, reservation) => {
      (acc[reservation.roomId] ??= []).push(reservation);
      return acc;
    }, {});

    const unavailableDates: string[] = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dayStart = new Date(Date.UTC(year, month, day));
      const dayEnd = new Date(Date.UTC(year, month, day + 1));
      const dayKey = dateKey(new Date(year, month, day));
      const touchesToday = dayKey === todayKey;

      const available = rooms.some((room) => {
        if (touchesToday && room.status !== 'available') return false;
        return !(reservationsByRoom[room.id] ?? []).some((reservation) => (
          reservation.checkInDate < dayEnd && reservation.checkOutDate > dayStart
        ));
      });

      if (!available) unavailableDates.push(dateKey(new Date(year, month, day)));
    }

    return NextResponse.json({ ok: true, unavailableDates });
  } catch (error) {
    console.error('Public availability fetch failed.', error);
    return NextResponse.json({ ok: false, message: 'Müsaitlik alınamadı.' }, { status: 503 });
  }
}
