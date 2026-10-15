import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { ok, err, validate, withHandler, type ApiContext } from "@/lib/api-handler";

const patchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  category: z.string().max(40).optional().nullable(),
  kcal: z.number().nonnegative().optional(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fat: z.number().nonnegative().optional(),
  defaultServingG: z.number().positive().optional().nullable(),
});

export const PATCH = withHandler(async (req: NextRequest, ctx: ApiContext) => {
  const user = await requireUser();
  const { id } = (await ctx.params) as { id: string };
  if (user.role !== "ADMIN" && user.role !== "STAFF") return err("Yetkisiz", 403);

  const { data, error } = await validate(patchSchema, req);
  if (error) return error;

  const food = await prisma.food.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.category !== undefined ? { category: data.category?.trim() || null } : {}),
      ...(data.kcal !== undefined ? { kcal: data.kcal } : {}),
      ...(data.protein !== undefined ? { protein: data.protein } : {}),
      ...(data.carbs !== undefined ? { carbs: data.carbs } : {}),
      ...(data.fat !== undefined ? { fat: data.fat } : {}),
      ...(data.defaultServingG !== undefined ? { defaultServingG: data.defaultServingG } : {}),
    },
  });

  await audit({ userId: user.sub, ip: getClientIp(req), action: "food.update", entity: "food", entityId: id });
  return ok(food);
});

export const DELETE = withHandler(async (req: NextRequest, ctx: ApiContext) => {
  const user = await requireUser();
  const { id } = (await ctx.params) as { id: string };

  const food = await prisma.food.findUnique({ where: { id }, select: { createdById: true, isPublic: true } });
  if (!food) return err("Besin bulunamadı", 404);

  const isAdmin = user.role === "ADMIN" || user.role === "STAFF";
  const isOwner = food.createdById === user.sub;
  // Yönetim her besini, kullanıcı yalnızca kendi özel besinini silebilir
  if (!isAdmin && !(isOwner && !food.isPublic)) return err("Yetkisiz", 403);

  await prisma.food.delete({ where: { id } });
  if (isAdmin) await audit({ userId: user.sub, ip: getClientIp(req), action: "food.delete", entity: "food", entityId: id });
  return ok({ ok: true });
});
