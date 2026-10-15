import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || auth.user.roleSlug !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }
  const products = await prisma.couponProduct.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json({ ok: true, products });
}

const productSchema = z.object({
  name: z.string().trim().min(1).max(120),
  pointsCost: z.coerce.number().int().min(1).max(1_000_000),
  discountType: z.enum(['percent', 'fixed']).default('percent'),
  value: z.coerce.number().int().min(1).max(1_000_000),
  minSpend: z.coerce.number().int().min(0).max(10_000_000).default(0),
  maxDiscount: z.coerce.number().int().min(0).max(10_000_000).optional().nullable(),
  expiresInDays: z.coerce.number().int().min(1).max(3650).optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || auth.user.roleSlug !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Kupon ürünü bilgileri geçersiz.' }, { status: 400 });
  }
  if (parsed.data.discountType === 'percent' && parsed.data.value > 100) {
    return NextResponse.json({ ok: false, message: 'Yüzde indirim en fazla 100 olabilir.' }, { status: 400 });
  }

  const product = await prisma.couponProduct.create({
    data: {
      name: parsed.data.name,
      pointsCost: parsed.data.pointsCost,
      discountType: parsed.data.discountType,
      value: parsed.data.value,
      minSpend: parsed.data.minSpend,
      maxDiscount: parsed.data.maxDiscount ?? null,
      expiresInDays: parsed.data.expiresInDays ?? null,
      isActive: parsed.data.isActive,
    },
  });

  await writeAuditLog({
    request, auth, action: 'coupon_product.create', entityType: 'coupon_product', entityId: product.id,
    summary: `Kupon ürünü oluşturuldu: ${product.name}`,
  });

  return NextResponse.json({ ok: true, product }, { status: 201 });
}
