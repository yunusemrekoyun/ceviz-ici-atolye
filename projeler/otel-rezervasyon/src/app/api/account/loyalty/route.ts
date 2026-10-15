import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { isLoyaltyEnabled } from '@/lib/loyalty/coupons';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 401 });

  const enabled = await isLoyaltyEnabled();

  const [user, coupons, products] = await Promise.all([
    prisma.user.findUnique({ where: { id: auth.user.id }, select: { loyaltyPoints: true } }),
    prisma.coupon.findMany({
      where: { userId: auth.user.id, status: 'active' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, code: true, kind: true, discountType: true, value: true,
        minSpend: true, maxDiscount: true, balance: true, expiresAt: true, sourceLabel: true,
      },
    }),
    enabled
      ? prisma.couponProduct.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { pointsCost: 'asc' }] })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    ok: true,
    enabled,
    points: user?.loyaltyPoints ?? 0,
    coupons,
    products,
  });
}
