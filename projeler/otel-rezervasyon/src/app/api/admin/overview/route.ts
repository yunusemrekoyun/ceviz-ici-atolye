import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || auth.user.roleSlug !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    reservationsTotal, activeRooms, occupiedNow,
    todayArrivals, todayDepartures,
    monthAgg, recentReservations, recentActivity,
  ] = await Promise.all([
    prisma.reservation.count(),
    prisma.room.count({ where: { isActive: true } }),
    prisma.room.count({ where: { status: 'occupied' } }),
    prisma.reservation.count({ where: { checkInDate: { gte: todayStart, lte: todayEnd }, status: { in: ['confirmed', 'pending'] } } }),
    prisma.reservation.count({ where: { checkOutDate: { gte: todayStart, lte: todayEnd }, status: 'checked_in' } }),
    prisma.payment.aggregate({ where: { status: 'paid', paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.reservation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true, confirmationId: true, firstName: true, lastName: true,
        status: true, totalPrice: true, checkInDate: true, checkOutDate: true,
        room: { select: { name: true, roomType: { select: { name: true } } } },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, actorEmail: true, actorRole: true, action: true, summary: true, createdAt: true },
    }),
  ]);

  const occupancyRate = activeRooms > 0 ? Math.round((occupiedNow / activeRooms) * 100) : 0;

  return NextResponse.json({
    ok: true,
    stats: {
      reservationsTotal,
      activeRooms,
      occupiedNow,
      occupancyRate,
      todayArrivals,
      todayDepartures,
      monthCollected: monthAgg._sum.amount ?? 0,
    },
    recentReservations,
    recentActivity,
  });
}
