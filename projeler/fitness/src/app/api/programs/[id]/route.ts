import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await ctx.params;

    const program = await prisma.workoutProgram.findUnique({
      where: { id },
      include: {
        member: { include: { user: { select: { name: true, avatarUrl: true } } } },
        trainer: { include: { user: { select: { name: true } } } },
        days: { include: { exercises: { orderBy: { order: "asc" } } }, orderBy: { dayNumber: "asc" } },
      },
    });

    if (!program) return NextResponse.json({ error: "Program bulunamadı" }, { status: 404 });

    // Üye sadece kendi programını görebilir
    if (user.role === "MEMBER") {
      const member = await prisma.member.findUnique({ where: { userId: user.sub } });
      if (program.memberId !== member?.id) {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
      }
    }

    return NextResponse.json(program);
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

    if (user.role === "TRAINER") {
      const trainer = await prisma.trainer.findFirst({ where: { userId: user.sub } });
      const program = await prisma.workoutProgram.findUnique({ where: { id }, select: { trainerId: true } });
      if (!trainer || !program || program.trainerId !== trainer.id) {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
      }
    }

    const { title, description, isActive, endDate } = await req.json();

    const updated = await prisma.workoutProgram.update({
      where: { id },
      data: {
        ...(title ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
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

    if (user.role === "TRAINER") {
      const trainer = await prisma.trainer.findFirst({ where: { userId: user.sub } });
      const program = await prisma.workoutProgram.findUnique({ where: { id }, select: { trainerId: true } });
      if (!trainer || !program || program.trainerId !== trainer.id) {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
      }
    }

    await prisma.workoutProgram.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
