import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';

export const runtime = 'nodejs';

/** GET: List all room types with their media */
export async function GET() {
  try {
    const roomTypes = await prisma.roomType.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    // Fetch media for all room types in one query
    const ids = roomTypes.map(rt => rt.id);
    const media = ids.length > 0
      ? await prisma.media.findMany({
          where: { entityType: 'room_type', entityId: { in: ids } },
          orderBy: { sortOrder: 'asc' },
        })
      : [];

    const mediaByRoomType = media.reduce<Record<string, typeof media>>((acc, m) => {
      (acc[m.entityId] ??= []).push(m);
      return acc;
    }, {});

    const result = roomTypes.map(rt => ({
      ...rt,
      media: mediaByRoomType[rt.id] ?? [],
    }));

    return NextResponse.json({ ok: true, roomTypes: result });
  } catch (error) {
    console.error('Room types fetch error:', error);
    return NextResponse.json(
      { ok: false, message: 'Oda tipleri yüklenirken hata oluştu.' },
      { status: 500 }
    );
  }
}

/** POST: Create a new room type (admin only) */
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
    const { name, amenities } = body as { name: string; amenities: string[] };

    if (!name || !name.trim()) {
      return NextResponse.json(
        { ok: false, message: 'Oda adı zorunludur.' },
        { status: 400 }
      );
    }

    const roomType = await prisma.roomType.create({
      data: {
        name: name.trim(),
        amenities: amenities || [],
      },
    });

    return NextResponse.json({ ok: true, roomType: { ...roomType, media: [] } }, { status: 201 });
  } catch (error) {
    console.error('Room type create error:', error);
    return NextResponse.json(
      { ok: false, message: 'Oda tipi oluşturulurken hata oluştu.' },
      { status: 500 }
    );
  }
}
