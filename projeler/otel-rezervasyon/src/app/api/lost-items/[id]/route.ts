import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthContextFromRequest(request);
    if (!auth || !['admin', 'personel'].includes(auth.user.roleSlug)) {
      return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const item = await prisma.lostItem.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
      },
      include: {
        room: { select: { id: true, name: true, floor: true } },
        foundBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json({ ok: true, item });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Güncelleme başarısız.';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
