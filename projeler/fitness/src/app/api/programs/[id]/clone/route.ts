import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser();
    if (!["ADMIN", "STAFF", "TRAINER"].includes(user.role)) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const memberId: string | undefined = body.memberId || undefined;
    const startDate: string = body.startDate || new Date().toISOString();
    const endDate: string | null = body.endDate || null;
    const title: string | undefined = body.title;

    const source = await prisma.workoutProgram.findUnique({
      where: { id },
      include: {
        days: {
          include: { exercises: { orderBy: { order: "asc" } } },
          orderBy: { dayNumber: "asc" },
        },
      },
    });

    if (!source) return NextResponse.json({ error: "Program bulunamadı" }, { status: 404 });

    if (user.role === "TRAINER") {
      const trainer = await prisma.trainer.findFirst({ where: { userId: user.sub } });
      if (!trainer || source.trainerId !== trainer.id) {
        return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
      }
    }

    const isTemplate = !memberId;

    const clone = await prisma.workoutProgram.create({
      data: {
        trainerId: source.trainerId,
        memberId: memberId ?? null,
        title: title ?? source.title,
        description: source.description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true,
        isTemplate,
        days: {
          create: source.days.map((day) => ({
            dayNumber: day.dayNumber,
            label: day.label,
            exercises: {
              create: day.exercises.map(({ id: _id, dayId: _dayId, ...ex }) => ex),
            },
          })),
        },
      },
      include: {
        days: {
          include: { exercises: { orderBy: { order: "asc" } } },
          orderBy: { dayNumber: "asc" },
        },
      },
    });

    return NextResponse.json(clone, { status: 201 });
  } catch (e) {
    console.error("[programs/clone]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
