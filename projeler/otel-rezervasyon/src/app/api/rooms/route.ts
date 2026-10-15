import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';

export const runtime = 'nodejs';

/** GET: List all rooms with their room type and media.
 *  Optional ?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD filters out rooms
 *  that have a conflicting active reservation in that date range.
 */
export async function GET(request: NextRequest) {
  const authContext = await getAuthContextFromRequest(request).catch(() => null);
  if (!authContext || !['admin', 'personel', 'temizlikci'].includes(authContext.user.roleSlug)) {
    return NextResponse.json(
      { ok: false, message: 'Yetkisiz erişim.' },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const checkInParam  = searchParams.get('checkIn');
  const checkOutParam = searchParams.get('checkOut');

  let bookedRoomIds: string[] = [];
  if (checkInParam && checkOutParam) {
    const checkIn  = new Date(checkInParam);
    const checkOut = new Date(checkOutParam);
    if (!isNaN(checkIn.getTime()) && !isNaN(checkOut.getTime()) && checkOut > checkIn) {
      const conflicts = await prisma.reservation.findMany({
        where: {
          status: { notIn: ['cancelled'] },
          AND: [
            { checkInDate:  { lt: checkOut } },
            { checkOutDate: { gt: checkIn  } },
          ],
        },
        select: { roomId: true },
      });
      bookedRoomIds = conflicts.map(c => c.roomId);
    }
  }

  try {
    const rooms = await prisma.room.findMany({
      where: bookedRoomIds.length > 0 ? { id: { notIn: bookedRoomIds } } : {},
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        roomType: {
          select: { id: true, name: true, amenities: true },
        },
      },
    });

    // Fetch media for all rooms in one query
    const ids = rooms.map(r => r.id);
    const media = ids.length > 0
      ? await prisma.media.findMany({
          where: { entityType: 'room', entityId: { in: ids } },
          orderBy: { sortOrder: 'asc' },
        })
      : [];

    const mediaByRoom = media.reduce<Record<string, typeof media>>((acc, m) => {
      (acc[m.entityId] ??= []).push(m);
      return acc;
    }, {});

    const result = rooms.map(r => ({ ...r, media: mediaByRoom[r.id] ?? [] }));

    return NextResponse.json({ ok: true, rooms: result });
  } catch (error) {
    console.error('Rooms fetch error:', error);
    return NextResponse.json(
      { ok: false, message: 'Odalar yüklenirken hata oluştu.' },
      { status: 500 }
    );
  }
}

/** POST: Create a new room (admin only) */
export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContextFromRequest(request);
    if (!authContext || authContext.user.roleSlug !== 'admin') {
      return NextResponse.json(
        { ok: false, message: 'Yetkisiz erişim.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, roomTypeId, floor, basePrice, description, status, maxAdults, maxChildren } = body as {
      name: string;
      roomTypeId: string;
      floor?: number;
      basePrice: number;
      description?: string;
      status?: string;
      maxAdults?: number;
      maxChildren?: number;
    };

    if (!name?.trim()) {
      return NextResponse.json({ ok: false, message: 'Oda adı zorunludur.' }, { status: 400 });
    }
    if (!roomTypeId) {
      return NextResponse.json({ ok: false, message: 'Oda çeşidi seçimi zorunludur.' }, { status: 400 });
    }
    if (!basePrice || basePrice <= 0) {
      return NextResponse.json({ ok: false, message: 'Geçerli bir fiyat girilmesi zorunludur.' }, { status: 400 });
    }
    if (!maxAdults || maxAdults < 1) {
      return NextResponse.json({ ok: false, message: 'En az 1 yetişkin kapasitesi girilmelidir.' }, { status: 400 });
    }

    const room = await prisma.room.create({
      data: {
        name: name.trim(),
        roomTypeId,
        floor: floor ?? null,
        basePrice,
        description: description?.trim() || null,
        status: status || 'available',
        maxAdults: maxAdults ?? 2,
        maxChildren: maxChildren ?? 0,
      },
      include: {
        roomType: { select: { id: true, name: true, amenities: true } },
      },
    });

    return NextResponse.json({ ok: true, room: { ...room, media: [] } }, { status: 201 });
  } catch (error) {
    console.error('Room create error:', error);
    return NextResponse.json(
      { ok: false, message: 'Oda oluşturulurken hata oluştu.' },
      { status: 500 }
    );
  }
}
