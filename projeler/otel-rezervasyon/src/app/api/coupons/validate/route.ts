import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { validateCoupon } from '@/lib/loyalty/coupons';

export const runtime = 'nodejs';

const schema = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.coerce.number().int().min(0),
});

export async function POST(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) {
    return NextResponse.json({ ok: false, message: 'Kupon kullanmak için giriş yapmalısınız.' }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Geçersiz istek.' }, { status: 400 });
  }

  const result = await validateCoupon(auth.user.id, parsed.data.code, parsed.data.subtotal);
  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: 200 });
  }

  return NextResponse.json({
    ok: true,
    code: result.code,
    discount: result.discount,
    discountType: result.discountType,
  });
}
