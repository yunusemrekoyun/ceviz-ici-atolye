import { prisma, type PrismaTransactionClient } from '@/lib/prisma';

export const BLOCKING_RESERVATION_STATUSES = ['cancelled'];

type DbClient = PrismaTransactionClient;

export function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function dateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

export function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function nightsBetween(checkIn: Date, checkOut: Date) {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
}

export function rangeTouchesToday(checkIn: Date, checkOut: Date) {
  const today = startOfTodayUtc();
  return checkIn <= today && checkOut > today;
}

export async function roomHasReservationConflict(
  db: DbClient,
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeReservationId?: string,
) {
  const now = new Date();
  const conflict = await db.reservation.findFirst({
    where: {
      roomId,
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
      status: { notIn: BLOCKING_RESERVATION_STATUSES },
      NOT: {
        status: 'payment_pending',
        paymentExpiresAt: { lte: now },
      },
      AND: [
        { checkInDate: { lt: checkOut } },
        { checkOutDate: { gt: checkIn } },
      ],
    },
    select: { id: true },
  });

  return Boolean(conflict);
}

export async function getRoomAvailability(
  db: DbClient,
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  excludeReservationId?: string,
) {
  const room = await db.room.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      status: true,
      isActive: true,
      basePrice: true,
      maxAdults: true,
      maxChildren: true,
      roomTypeId: true,
    },
  });

  if (!room || !room.isActive) return { available: false, reason: 'not_found' as const, room };

  if (rangeTouchesToday(checkIn, checkOut) && room.status !== 'available') {
    return { available: false, reason: 'current_status' as const, room };
  }

  const hasConflict = await roomHasReservationConflict(db, roomId, checkIn, checkOut, excludeReservationId);
  if (hasConflict) return { available: false, reason: 'reservation_conflict' as const, room };

  return { available: true, reason: null, room };
}

export async function findAvailableRoomForRoomType(
  db: DbClient,
  {
    roomTypeId,
    checkIn,
    checkOut,
    adultsCount,
    childrenCount,
    excludeReservationId,
  }: {
    roomTypeId: string;
    checkIn: Date;
    checkOut: Date;
    adultsCount: number;
    childrenCount: number;
    excludeReservationId?: string;
  },
) {
  const rooms = await db.room.findMany({
    where: {
      roomTypeId,
      isActive: true,
      roomType: { isActive: true },
      maxAdults: { gte: adultsCount },
      maxChildren: { gte: childrenCount },
      ...(rangeTouchesToday(checkIn, checkOut) ? { status: 'available' } : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      status: true,
      basePrice: true,
      maxAdults: true,
      maxChildren: true,
      roomTypeId: true,
    },
  });

  for (const room of rooms) {
    const hasConflict = await roomHasReservationConflict(db, room.id, checkIn, checkOut, excludeReservationId);
    if (!hasConflict) return room;
  }

  return null;
}

export async function isRoomTypeAvailableOnDate(
  db: DbClient,
  roomTypeId: string,
  date: Date,
) {
  const next = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  const room = await findAvailableRoomForRoomType(db, {
    roomTypeId,
    checkIn: date,
    checkOut: next,
    adultsCount: 1,
    childrenCount: 0,
  });

  return Boolean(room);
}
