import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContextFromRequest(request);
    if (!auth || auth.user.roleSlug !== 'admin') {
      return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: { role: { slug: { not: 'musteri' } } },
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        role: { select: { id: true, name: true, slug: true } },
        _count: { select: { reservations: true } },
      },
    });

    return NextResponse.json({ ok: true, users });
  } catch {
    return NextResponse.json({ ok: false, message: 'Kullanıcılar alınamadı.' }, { status: 503 });
  }
}
