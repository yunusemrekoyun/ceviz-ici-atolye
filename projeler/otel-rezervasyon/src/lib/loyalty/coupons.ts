import { prisma, type PrismaTransactionClient } from '@/lib/prisma';

export const POINTS_PER_TRY = 10; // ₺10 spent = 1 point

export async function isLoyaltyEnabled(): Promise<boolean> {
  const row = await prisma.systemSetting.findUnique({ where: { key: 'loyalty_enabled' } });
  return row?.value === 'true';
}

export function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

interface CouponLike {
  discountType: string;
  value: number;
  minSpend: number;
  maxDiscount: number | null;
  balance: number | null;
}

/** Discount (in TRY) this coupon yields on the given subtotal, capped at subtotal. */
export function computeCouponDiscount(coupon: CouponLike, subtotal: number): number {
  if (subtotal < coupon.minSpend) return 0;
  if (coupon.discountType === 'percent') {
    let d = Math.round((subtotal * coupon.value) / 100);
    if (coupon.maxDiscount != null) d = Math.min(d, coupon.maxDiscount);
    return Math.max(0, Math.min(d, subtotal));
  }
  // fixed / credit — use remaining balance when present
  const available = coupon.balance ?? coupon.value;
  return Math.max(0, Math.min(available, subtotal));
}

export type CouponValidation =
  | { ok: true; couponId: string; code: string; discount: number; discountType: string }
  | { ok: false; message: string };

/** Validate a coupon for a user against a subtotal (does NOT consume it). */
export async function validateCoupon(userId: string, rawCode: string, subtotal: number): Promise<CouponValidation> {
  const code = normalizeCode(rawCode);
  const coupon = await prisma.coupon.findUnique({ where: { code } });

  if (!coupon || coupon.userId !== userId) return { ok: false, message: 'Kupon bulunamadı.' };
  if (coupon.status !== 'active') return { ok: false, message: 'Kupon kullanılmış veya geçersiz.' };
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) return { ok: false, message: 'Kuponun süresi dolmuş.' };
  if (subtotal < coupon.minSpend) return { ok: false, message: `Bu kupon en az ₺${coupon.minSpend.toLocaleString('tr-TR')} tutarındaki rezervasyonlarda geçerli.` };

  const discount = computeCouponDiscount(coupon, subtotal);
  if (discount <= 0) return { ok: false, message: 'Kupon bu tutara uygulanamıyor.' };

  return { ok: true, couponId: coupon.id, code: coupon.code, discount, discountType: coupon.discountType };
}

/**
 * Consume a coupon after a successful payment. Percent coupons are single-use;
 * fixed/credit coupons decrement their balance and stay active until exhausted.
 */
export async function consumeCoupon(tx: PrismaTransactionClient, rawCode: string, discountApplied: number) {
  const code = normalizeCode(rawCode);
  const coupon = await tx.coupon.findUnique({ where: { code } });
  if (!coupon || coupon.status !== 'active') return;

  if (coupon.discountType === 'percent') {
    await tx.coupon.update({ where: { id: coupon.id }, data: { status: 'used', usedAt: new Date() } });
    return;
  }

  const remaining = (coupon.balance ?? coupon.value) - discountApplied;
  await tx.coupon.update({
    where: { id: coupon.id },
    data: {
      balance: Math.max(remaining, 0),
      status: remaining > 0 ? 'active' : 'used',
      usedAt: remaining > 0 ? null : new Date(),
    },
  });
}

/** Reverse a coupon consumption (e.g. when the reservation that used it is cancelled). */
export async function restoreCoupon(tx: PrismaTransactionClient, rawCode: string, discountApplied: number) {
  const code = normalizeCode(rawCode);
  const coupon = await tx.coupon.findUnique({ where: { code } });
  if (!coupon) return;

  if (coupon.discountType === 'percent') {
    await tx.coupon.update({ where: { id: coupon.id }, data: { status: 'active', usedAt: null } });
    return;
  }

  await tx.coupon.update({
    where: { id: coupon.id },
    data: { balance: (coupon.balance ?? 0) + discountApplied, status: 'active', usedAt: null },
  });
}

/** Award loyalty points for a completed (checked-out) stay. Returns points granted. */
export async function awardCheckoutPoints(
  tx: PrismaTransactionClient,
  userId: string,
  reservationId: string,
  amount: number,
) {
  const points = Math.floor(amount / POINTS_PER_TRY);
  if (points <= 0) return 0;
  await tx.user.update({ where: { id: userId }, data: { loyaltyPoints: { increment: points } } });
  await tx.pointsLedger.create({ data: { userId, delta: points, reason: 'earn_checkout', reservationId } });
  return points;
}
