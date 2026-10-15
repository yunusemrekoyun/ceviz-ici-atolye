import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

const itemSchema = z.object({
  foodId: z.string().optional().nullable(),
  customName: z.string().max(120).optional().nullable(),
  grams: z.number().positive().max(5000).default(100),
  note: z.string().max(200).optional().nullable(),
  order: z.number().int().default(0),
});

const mealSchema = z.object({
  type: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  label: z.string().max(60).optional().nullable(),
  order: z.number().int().default(0),
  items: z.array(itemSchema).default([]),
});

const planSchema = z.object({
  memberId: z.string().min(1).optional().nullable(),
  isTemplate: z.boolean().default(false),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  calorieTarget: z.number().nonnegative().optional().nullable(),
  proteinTarget: z.number().nonnegative().optional().nullable(),
  carbTarget: z.number().nonnegative().optional().nullable(),
  fatTarget: z.number().nonnegative().optional().nullable(),
  waterTargetMl: z.number().int().nonnegative().optional().nullable(),
  meals: z.array(mealSchema).default([]),
});

const planInclude = {
  member: { include: { user: { select: { name: true } } } },
  trainer: { include: { user: { select: { name: true } } } },
  meals: {
    orderBy: { order: "asc" as const },
    include: { items: { orderBy: { order: "asc" as const }, include: { food: true } } },
  },
};

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sp = req.nextUrl.searchParams;
    const memberId = sp.get("memberId");
    const trainerId = sp.get("trainerId");

    const plans = await prisma.nutritionPlan.findMany({
      where: {
        ...(memberId ? { memberId } : {}),
        ...(trainerId ? { trainerId } : {}),
        ...(user.role === "MEMBER" ? { member: { userId: user.sub } } : {}),
      },
      include: planInclude,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(plans);
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!["ADMIN", "STAFF", "TRAINER"].includes(user.role)) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    const trainer = await prisma.trainer.findFirst({ where: { userId: user.sub } });
    if (!trainer && user.role === "TRAINER") {
      return NextResponse.json({ error: "Antrenör kaydı bulunamadı" }, { status: 404 });
    }
    const trainerId = trainer?.id ?? (await prisma.trainer.findFirst({ orderBy: { createdAt: "asc" } }))?.id;
    if (!trainerId) return NextResponse.json({ error: "Antrenör bulunamadı" }, { status: 404 });

    const body = await req.json();
    const parsed = planSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { meals, startDate, endDate, isTemplate, memberId, ...rest } = parsed.data;

    // Bir üyenin aktif planı tek olsun — yenisi gelince eskisini pasife al
    if (memberId) {
      await prisma.nutritionPlan.updateMany({ where: { memberId, isActive: true }, data: { isActive: false } });
    }

    const plan = await prisma.nutritionPlan.create({
      data: {
        ...rest,
        trainerId,
        memberId: memberId ?? null,
        isTemplate: isTemplate || !memberId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        meals: {
          create: meals.map(({ items, ...meal }) => ({
            ...meal,
            items: {
              create: items.map((it) => ({
                foodId: it.foodId || null,
                customName: it.customName || null,
                grams: it.grams,
                note: it.note || null,
                order: it.order,
              })),
            },
          })),
        },
      },
      include: planInclude,
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (e) {
    console.error("[nutrition-plans POST]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
