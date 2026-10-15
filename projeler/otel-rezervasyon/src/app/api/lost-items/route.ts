import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContextFromRequest(request);
    if (!auth || !['admin', 'personel', 'temizlikci'].includes(auth.user.roleSlug)) {
      return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const items = await prisma.lostItem.findMany({
      orderBy: { foundAt: 'desc' },
      include: {
        room: { select: { id: true, name: true, floor: true } },
        foundBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json({ ok: true, items });
  } catch {
    return NextResponse.json({ ok: false, message: 'Kayıtlar alınamadı.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContextFromRequest(request);
    if (!auth || !['admin', 'personel', 'temizlikci'].includes(auth.user.roleSlug)) {
      return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const body = await request.json();
    const { roomId, description } = body;

    if (!roomId || !description?.trim()) {
      return NextResponse.json({ ok: false, message: 'Oda ve açıklama zorunludur.' }, { status: 400 });
    }

    const item = await prisma.lostItem.create({
      data: {
        roomId,
        foundById: auth.user.id,
        description: description.trim(),
        status: 'found',
      },
      include: {
        room: { select: { id: true, name: true, floor: true } },
        foundBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json({ ok: true, item }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Kayıt oluşturulamadı.';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
