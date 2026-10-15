import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { isLoyaltyEnabled } from '@/lib/loyalty/coupons';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

const schema = z.object({ productId: z.string().min(1) });

async function generateUniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i += 1) {
    const code = `KG-${randomBytes(4).toString('hex').toUpperCase()}`; // KG-XXXXXXXX
    const exists = await prisma.coupon.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  return `KG-${Date.now().toString(36).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || auth.user.roleSlug !== 'musteri') {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }

  if (!(await isLoyaltyEnabled())) {
    return NextResponse.json({ ok: false, message: 'Sadakat programı şu anda kapalı.' }, { status: 409 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Geçersiz istek.' }, { status: 400 });
  }

  const product = await prisma.couponProduct.findUnique({ where: { id: parsed.data.productId } });
  if (!product || !product.isActive) {
    return NextResponse.json({ ok: false, message: 'Kupon bulunamadı.' }, { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { id: auth.user.id }, select: { loyaltyPoints: true } });
  if (!user || user.loyaltyPoints < product.pointsCost) {
    return NextResponse.json({ ok: false, message: 'Yeterli puanınız yok.' }, { status: 409 });
  }

  const code = await generateUniqueCode();
  const expiresAt = product.expiresInDays
    ? new Date(Date.now() + product.expiresInDays * 86_400_000)
    : null;

  const result = await prisma.$transaction(async (tx) => {
    // Guard against concurrent spends.
    const fresh = await tx.user.findUnique({ where: { id: auth.user.id }, select: { loyaltyPoints: true } });
    if (!fresh || fresh.loyaltyPoints < product.pointsCost) throw new Error('INSUFFICIENT_POINTS');

    const updatedUser = await tx.user.update({
      where: { id: auth.user.id },
      data: { loyaltyPoints: { decrement: product.pointsCost } },
      select: { loyaltyPoints: true },
    });

    const created = await tx.coupon.create({
      data: {
        code,
        userId: auth.user.id,
        kind: 'loyalty',
        discountType: product.discountType,
        value: product.value,
        minSpend: product.minSpend,
        maxDiscount: product.maxDiscount,
        balance: product.discountType === 'fixed' ? product.value : null,
        status: 'active',
        sourceLabel: product.name,
        couponProductId: product.id,
        expiresAt,
      },
    });

    await tx.pointsLedger.create({
      data: { userId: auth.user.id, delta: -product.pointsCost, reason: 'spend_coupon', note: product.name },
    });

    return { coupon: created, points: updatedUser.loyaltyPoints };
  }).catch((e) => {
    if (e instanceof Error && e.message === 'INSUFFICIENT_POINTS') return null;
    throw e;
  });

  if (!result) {
    return NextResponse.json({ ok: false, message: 'Yeterli puanınız yok.' }, { status: 409 });
  }

  await writeAuditLog({
    request, auth, action: 'loyalty.purchase', entityType: 'coupon', entityId: result.coupon.id,
    summary: `Kupon satın alındı: ${product.name} (${product.pointsCost} puan)`,
  });

  return NextResponse.json({ ok: true, coupon: result.coupon, points: result.points }, { status: 201 });
}
