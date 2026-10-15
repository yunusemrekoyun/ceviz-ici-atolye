import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findAvailableRoomForRoomType, parseDateOnly } from '@/lib/reservations/availability';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const checkInParam = searchParams.get('checkIn');
  const checkOutParam = searchParams.get('checkOut');

  const checkIn = checkInParam ? parseDateOnly(checkInParam) : null;
  const checkOut = checkOutParam ? parseDateOnly(checkOutParam) : null;
  const hasValidRange = checkIn && checkOut && !Number.isNaN(checkIn.getTime()) && !Number.isNaN(checkOut.getTime()) && checkOut > checkIn;

  try {
    const roomTypes = await prisma.roomType.findMany({
      where: {
        isActive: true,
        rooms: { some: { isActive: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        rooms: {
          where: { isActive: true },
          orderBy: [{ basePrice: 'asc' }, { sortOrder: 'asc' }],
          select: {
            id: true,
            basePrice: true,
            description: true,
            maxAdults: true,
            maxChildren: true,
          },
        },
      },
    });

    const roomIds = roomTypes.flatMap((type) => type.rooms.map((room) => room.id));
    const typeIds = roomTypes.map((type) => type.id);

    const media = await prisma.media.findMany({
      where: {
        OR: [
          { entityType: 'room_type', entityId: { in: typeIds } },
          { entityType: 'room', entityId: { in: roomIds } },
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });

    const mediaByEntity = media.reduce<Record<string, typeof media>>((acc, item) => {
      (acc[`${item.entityType}:${item.entityId}`] ??= []).push(item);
      return acc;
    }, {});

    const rooms = await Promise.all(roomTypes.map(async (type) => {
      const cheapest = type.rooms[0];
      const typeMedia = mediaByEntity[`room_type:${type.id}`];
      const firstRoomMedia = type.rooms
        .map((room) => mediaByEntity[`room:${room.id}`])
        .find((items) => items?.length);
      const available = hasValidRange
        ? Boolean(await findAvailableRoomForRoomType(prisma, {
            roomTypeId: type.id,
            checkIn: checkIn!,
            checkOut: checkOut!,
            adultsCount: 1,
            childrenCount: 0,
          }))
        : type.rooms.length > 0;

      const selectedMedia = typeMedia?.length ? typeMedia : (firstRoomMedia ?? []);

      return {
        id: type.id,
        roomTypeId: type.id,
        name: type.name,
        basePrice: cheapest?.basePrice ?? 0,
        description: cheapest?.description ?? null,
        maxAdults: Math.max(...type.rooms.map((room) => room.maxAdults)),
        maxChildren: Math.max(...type.rooms.map((room) => room.maxChildren)),
        available,
        roomType: {
          id: type.id,
          name: type.name,
          amenities: type.amenities,
        },
        media: selectedMedia.map((item) => ({
          id: item.id,
          originalName: item.originalName,
          mimeType: item.mimeType,
          size: item.size,
          pathOriginal: item.pathOriginal,
          pathThumb: item.pathThumb,
          pathMedium: item.pathMedium,
          pathLarge: item.pathLarge,
          isProcessed: item.isProcessed,
        })),
      };
    }));

    return NextResponse.json({ ok: true, rooms });
  } catch (error) {
    console.error('Public rooms fetch failed.', error);
    return NextResponse.json({ ok: false, message: 'Odalar yüklenemedi.' }, { status: 503 });
  }
}
