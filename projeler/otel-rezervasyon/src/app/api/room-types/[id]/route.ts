import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { deleteFile } from '@/lib/media/storage';

export const runtime = 'nodejs';

/** PATCH: Update room type name and/or amenities (admin only) */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthContextFromRequest(request);
    if (!authContext || authContext.user.roleSlug !== 'admin') {
      return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, amenities } = body as { name?: string; amenities?: string[] };

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ ok: false, message: 'Oda adı zorunludur.' }, { status: 400 });
    }

    const roomType = await prisma.roomType.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(amenities !== undefined && { amenities }),
      },
    });

    return NextResponse.json({ ok: true, roomType });
  } catch (error) {
    console.error('Room type update error:', error);
    return NextResponse.json(
      { ok: false, message: 'Oda çeşidi güncellenirken hata oluştu.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Remove a room type (admin only).
 *
 * ?force=true → also deletes all associated rooms and their media files.
 * Without force → returns 409 with the list of affected rooms if any exist.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthContextFromRequest(request);
    if (!authContext || authContext.user.roleSlug !== 'admin') {
      return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    const rooms = await prisma.room.findMany({
      where: { roomTypeId: id },
      select: { id: true, name: true },
    });

    if (rooms.length > 0 && !force) {
      return NextResponse.json({ ok: false, conflict: true, rooms }, { status: 409 });
    }

    if (rooms.length > 0) {
      const roomIds = rooms.map(r => r.id);

      // Delete room media files
      const roomMedia = await prisma.media.findMany({
        where: { entityType: 'room', entityId: { in: roomIds } },
      });
      await Promise.all(
        roomMedia.flatMap(m =>
          [m.pathOriginal, m.pathThumb, m.pathMedium, m.pathLarge]
            .filter(Boolean)
            .map(p => deleteFile(p!))
        )
      );
      await prisma.media.deleteMany({ where: { entityType: 'room', entityId: { in: roomIds } } });
      await prisma.room.deleteMany({ where: { roomTypeId: id } });
    }

    // Delete room type media files
    const typeMedia = await prisma.media.findMany({
      where: { entityType: 'room_type', entityId: id },
    });
    await Promise.all(
      typeMedia.flatMap(m =>
        [m.pathOriginal, m.pathThumb, m.pathMedium, m.pathLarge]
          .filter(Boolean)
          .map(p => deleteFile(p!))
      )
    );
    await prisma.media.deleteMany({ where: { entityType: 'room_type', entityId: id } });

    await prisma.roomType.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Room type delete error:', error);
    return NextResponse.json(
      { ok: false, message: 'Oda çeşidi silinirken hata oluştu.' },
      { status: 500 }
    );
  }
}
