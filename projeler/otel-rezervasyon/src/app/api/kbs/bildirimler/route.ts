import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { retryKbsBildirim } from '@/lib/kbs/notify';

export const runtime = 'nodejs';

// KBS bildirim izleme — admin ve resepsiyon (personel) görebilir/tekrar dener.

async function requireStaff(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || !['admin', 'personel'].includes(auth.user.roleSlug)) return null;
  return auth;
}

export async function GET(request: NextRequest) {
  const auth = await requireStaff(request);
  if (!auth) return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);

    const [items, hata, gonderildi, bekliyor] = await Promise.all([
      prisma.kbsBildirim.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { reservation: { select: { confirmationId: true } } },
      }),
      prisma.kbsBildirim.count({ where: { durum: 'hata' } }),
      prisma.kbsBildirim.count({ where: { durum: 'gonderildi' } }),
      prisma.kbsBildirim.count({ where: { durum: 'bekliyor' } }),
    ]);

    return NextResponse.json({
      ok: true,
      counts: { hata, gonderildi, bekliyor },
      items: items.map((b) => ({
        id: b.id,
        confirmationId: b.reservation.confirmationId,
        islemTipi: b.islemTipi,
        durum: b.durum,
        hataKodu: b.hataKodu,
        mesaj: b.mesaj,
        guestName: b.guestName,
        kimlikNo: b.kimlikNo,
        odaNo: b.odaNo,
        denemeSayisi: b.denemeSayisi,
        gonderimZamani: b.gonderimZamani,
        createdAt: b.createdAt,
      })),
    });
  } catch (error) {
    console.error('KBS bildirimleri okunamadı:', error);
    return NextResponse.json({ ok: false, message: 'Bildirimler okunamadı.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff(request);
  if (!auth) return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });

  try {
    const body = await request.json().catch(() => null);
    const id = typeof body?.id === 'string' ? body.id : null;
    if (!id) return NextResponse.json({ ok: false, message: 'Bildirim id gerekli.' }, { status: 400 });

    const result = await retryKbsBildirim(id);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (error) {
    console.error('KBS bildirimi tekrar denenemedi:', error);
    return NextResponse.json({ ok: false, message: 'Tekrar deneme başarısız.' }, { status: 500 });
  }
}
