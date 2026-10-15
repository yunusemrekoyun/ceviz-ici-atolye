import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  pointsCost: z.coerce.number().int().min(1).max(1_000_000).optional(),
  discountType: z.enum(['percent', 'fixed']).optional(),
  value: z.coerce.number().int().min(1).max(1_000_000).optional(),
  minSpend: z.coerce.number().int().min(0).max(10_000_000).optional(),
  maxDiscount: z.coerce.number().int().min(0).max(10_000_000).nullable().optional(),
  expiresInDays: z.coerce.number().int().min(1).max(3650).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || auth.user.roleSlug !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }
  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Geçersiz değer.' }, { status: 400 });
  }

  const product = await prisma.couponProduct.update({
    where: { id },
    data: parsed.data,
  }).catch(() => null);
  if (!product) {
    return NextResponse.json({ ok: false, message: 'Kupon ürünü bulunamadı.' }, { status: 404 });
  }

  await writeAuditLog({
    request, auth, action: 'coupon_product.update', entityType: 'coupon_product', entityId: id,
    summary: `Kupon ürünü güncellendi: ${product.name}`,
  });

  return NextResponse.json({ ok: true, product });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || auth.user.roleSlug !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }
  const { id } = await params;
  const deleted = await prisma.couponProduct.delete({ where: { id } }).catch(() => null);
  if (!deleted) {
    return NextResponse.json({ ok: false, message: 'Kupon ürünü bulunamadı.' }, { status: 404 });
  }

  await writeAuditLog({
    request, auth, action: 'coupon_product.delete', entityType: 'coupon_product', entityId: id,
    summary: `Kupon ürünü silindi: ${deleted.name}`,
  });

  return NextResponse.json({ ok: true });
}
