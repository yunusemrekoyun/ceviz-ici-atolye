import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

async function ensureTrainerOwns(userSub: string, planId: string) {
  const trainer = await prisma.trainer.findFirst({ where: { userId: userSub } });
  const plan = await prisma.nutritionPlan.findUnique({ where: { id: planId }, select: { trainerId: true } });
  return !!trainer && !!plan && plan.trainerId === trainer.id;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;

    const plan = await prisma.nutritionPlan.findUnique({
      where: { id },
      include: {
        member: { include: { user: { select: { name: true } } } },
        trainer: { include: { user: { select: { name: true } } } },
        meals: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" }, include: { food: true } } } },
      },
    });
    if (!plan) return NextResponse.json({ error: "Plan bulunamadı" }, { status: 404 });

    if (user.role === "MEMBER") {
      const member = await prisma.member.findUnique({ where: { userId: user.sub } });
      if (plan.memberId !== member?.id) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    return NextResponse.json(plan);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    if (!["ADMIN", "STAFF", "TRAINER"].includes(user.role)) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }
    const { id } = await ctx.params;
    if (user.role === "TRAINER" && !(await ensureTrainerOwns(user.sub, id))) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    const body = await req.json();
    const updated = await prisma.nutritionPlan.update({
      where: { id },
      data: {
        ...(body.title ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.endDate !== undefined ? { endDate: body.endDate ? new Date(body.endDate) : null } : {}),
        ...(body.calorieTarget !== undefined ? { calorieTarget: body.calorieTarget } : {}),
        ...(body.proteinTarget !== undefined ? { proteinTarget: body.proteinTarget } : {}),
        ...(body.carbTarget !== undefined ? { carbTarget: body.carbTarget } : {}),
        ...(body.fatTarget !== undefined ? { fatTarget: body.fatTarget } : {}),
        ...(body.waterTargetMl !== undefined ? { waterTargetMl: body.waterTargetMl } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    if (!["ADMIN", "STAFF", "TRAINER"].includes(user.role)) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }
    const { id } = await ctx.params;
    if (user.role === "TRAINER" && !(await ensureTrainerOwns(user.sub, id))) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    await prisma.nutritionPlan.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
