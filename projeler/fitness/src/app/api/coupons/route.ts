import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { ok, err, validate, withHandler } from "@/lib/api-handler";

const couponSchema = z.object({
  code: z.string().min(3, "Kod en az 3 karakter").max(40),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().positive("Değer 0'dan büyük olmalı"),
  minAmount: z.number().nonnegative().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  validFrom: z.string().datetime().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  planId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const GET = withHandler(async () => {
  await requireAdmin();
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return ok(coupons);
});

export const POST = withHandler(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const { data, error } = await validate(couponSchema, req);
  if (error) return error;

  const code = data.code.trim().toUpperCase();
  if (data.type === "PERCENT" && data.value > 100) return err("Yüzde indirim 100'den büyük olamaz", 400);

  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) return err("Bu kod zaten kullanılıyor", 409);

  const coupon = await prisma.coupon.create({
    data: {
      code,
      type: data.type,
      value: data.value,
      minAmount: data.minAmount ?? null,
      maxUses: data.maxUses ?? null,
      validFrom: data.validFrom ? new Date(data.validFrom) : null,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      planId: data.planId || null,
      isActive: data.isActive,
    },
  });

  await audit({ userId: admin.sub, ip: getClientIp(req), action: "coupon.create", entity: "coupon", entityId: coupon.id, meta: { code, type: data.type, value: data.value } });

  return ok(coupon, 201);
});
