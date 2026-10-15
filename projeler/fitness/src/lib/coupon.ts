import type { Coupon } from "@prisma/client";

export type CouponResult =
  | { ok: true; discount: number; finalAmount: number; couponCode: string }
  | { ok: false; error: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Bir kuponu tutar/plan bağlamında değerlendirir. İndirim ve nihai tutarı
 * 2 ondalığa yuvarlar; çağıran hem ödeme geçidine hem de Payment kaydına
 * AYNI değeri yazmalıdır.
 */
export function evaluateCoupon(coupon: Coupon, amount: number, planId?: string | null): CouponResult {
  if (!coupon.isActive) return { ok: false, error: "Kupon aktif değil" };

  const now = new Date();
  if (coupon.validFrom && now < coupon.validFrom) return { ok: false, error: "Kupon henüz geçerli değil" };
  if (coupon.validUntil && now > coupon.validUntil) return { ok: false, error: "Kuponun süresi dolmuş" };

  if (coupon.planId && planId && coupon.planId !== planId) {
    return { ok: false, error: "Bu kupon seçtiğin plan için geçerli değil" };
  }

  const minAmount = coupon.minAmount ? Number(coupon.minAmount) : 0;
  if (minAmount > 0 && amount < minAmount) {
    return { ok: false, error: `Bu kupon en az ${minAmount.toFixed(2)} ₺ tutarında geçerli` };
  }

  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, error: "Kupon kullanım limiti dolmuş" };
  }

  const value = Number(coupon.value);
  let discount = coupon.type === "PERCENT" ? (amount * value) / 100 : value;
  discount = round2(Math.min(discount, amount));
  const finalAmount = round2(amount - discount);

  return { ok: true, discount, finalAmount, couponCode: coupon.code };
}
