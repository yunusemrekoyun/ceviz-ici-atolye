import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { ok, err, validate, withHandler } from "@/lib/api-handler";

// Besin arama — herkese açık besinler + kullanıcının kendi eklediği özel besinler.
export const GET = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() || "";
  const category = sp.get("category")?.trim() || undefined;
  const take = Math.min(100, Math.max(1, parseInt(sp.get("take") ?? "40", 10)));

  const foods = await prisma.food.findMany({
    where: {
      AND: [
        { OR: [{ isPublic: true }, { createdById: user.sub }] },
        ...(q ? [{ name: { contains: q, mode: "insensitive" as const } }] : []),
        ...(category ? [{ category }] : []),
      ],
    },
    orderBy: { name: "asc" },
    take,
  });

  return ok({ foods });
});

const foodSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter").max(80),
  category: z.string().max(40).optional().nullable(),
  kcal: z.number().nonnegative(),
  protein: z.number().nonnegative().default(0),
  carbs: z.number().nonnegative().default(0),
  fat: z.number().nonnegative().default(0),
  defaultServingG: z.number().positive().optional().nullable(),
  isPublic: z.boolean().optional(),
});

export const POST = withHandler(async (req: NextRequest) => {
  const user = await requireUser();
  const { data, error } = await validate(foodSchema, req);
  if (error) return error;

  const isAdmin = user.role === "ADMIN" || user.role === "STAFF";
  if (!data.name.trim()) return err("İsim zorunlu", 400);

  const food = await prisma.food.create({
    data: {
      name: data.name.trim(),
      category: data.category?.trim() || null,
      kcal: data.kcal,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      defaultServingG: data.defaultServingG ?? null,
      // Ortak havuza ekleme yalnızca yönetim; diğerleri kendi özel besinini ekler
      isPublic: isAdmin ? data.isPublic ?? true : false,
      createdById: user.sub,
    },
  });

  return ok(food, 201);
});
