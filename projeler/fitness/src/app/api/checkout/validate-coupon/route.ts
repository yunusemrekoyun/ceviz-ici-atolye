import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ok, err, validate, withHandler } from "@/lib/api-handler";
import { evaluateCoupon } from "@/lib/coupon";

const schema = z.object({ code: z.string().min(1), planId: z.string() });

// Kuponu doğrular ve indirimli tutarı döner — hiçbir yan etki yaratmaz.
export const POST = withHandler(async (req: NextRequest) => {
  await requireUser();
  const { data, error } = await validate(schema, req);
  if (error) return error;

  const plan = await prisma.plan.findUnique({ where: { id: data.planId, isActive: true } });
  if (!plan) return err("Plan bulunamadı", 404);

  const coupon = await prisma.coupon.findUnique({ where: { code: data.code.trim().toUpperCase() } });
  if (!coupon) return err("Kupon bulunamadı", 404);

  const result = evaluateCoupon(coupon, Number(plan.price), plan.id);
  if (!result.ok) return err(result.error, 400);

  return ok({
    code: result.couponCode,
    discount: result.discount,
    finalAmount: result.finalAmount,
    originalAmount: Number(plan.price),
  });
});
