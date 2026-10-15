import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { ok, err, validate, withHandler, type ApiContext } from "@/lib/api-handler";

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  maxUses: z.number().int().positive().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
});

export const PATCH = withHandler(async (req: NextRequest, ctx: ApiContext) => {
  const admin = await requireAdmin();
  const { id } = (await ctx.params) as { id: string };
  const { data, error } = await validate(patchSchema, req);
  if (error) return error;

  const coupon = await prisma.coupon.update({
    where: { id },
    data: {
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.maxUses !== undefined ? { maxUses: data.maxUses } : {}),
      ...(data.validUntil !== undefined ? { validUntil: data.validUntil ? new Date(data.validUntil) : null } : {}),
    },
  });

  await audit({ userId: admin.sub, ip: getClientIp(req), action: "coupon.update", entity: "coupon", entityId: id, meta: { fields: Object.keys(data) } });

  return ok(coupon);
});

export const DELETE = withHandler(async (req: NextRequest, ctx: ApiContext) => {
  const admin = await requireAdmin();
  const { id } = (await ctx.params) as { id: string };

  const coupon = await prisma.coupon.findUnique({ where: { id }, select: { usedCount: true } });
  if (!coupon) return err("Kupon bulunamadı", 404);

  // Kullanılmış kuponu silmek yerine pasifleştir (geçmiş kaydı korunur)
  if (coupon.usedCount > 0) {
    await prisma.coupon.update({ where: { id }, data: { isActive: false } });
    await audit({ userId: admin.sub, ip: getClientIp(req), action: "coupon.deactivate", entity: "coupon", entityId: id, meta: { reason: "used" } });
    return ok({ ok: true, soft: true });
  }

  await prisma.coupon.delete({ where: { id } });
  await audit({ userId: admin.sub, ip: getClientIp(req), action: "coupon.delete", entity: "coupon", entityId: id });
  return ok({ ok: true });
});
