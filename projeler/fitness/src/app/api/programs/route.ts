import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { z } from "zod";

const exerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.number().int().min(1).optional().nullable(),
  reps: z.string().max(20).optional().nullable(),
  durationSec: z.number().int().optional().nullable(),
  restSec: z.number().int().optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
  order: z.number().int().default(0),
  videoUrl: z.string().url().optional().nullable(),
});

const daySchema = z.object({
  dayNumber: z.number().int().min(1).max(7),
  label: z.string().max(60).optional().nullable(),
  exercises: z.array(exerciseSchema).default([]),
});

const programSchema = z.object({
  memberId: z.string().min(1).optional().nullable(),
  isTemplate: z.boolean().default(false),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  days: z.array(daySchema).default([]),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sp = req.nextUrl.searchParams;
    const memberId = sp.get("memberId");
    const trainerId = sp.get("trainerId");

    const programs = await prisma.workoutProgram.findMany({
      where: {
        ...(memberId ? { memberId } : {}),
        ...(trainerId ? { trainerId } : {}),
        ...(user.role === "MEMBER" ? { member: { userId: user.sub } } : {}),
      },
      include: {
        member: { include: { user: { select: { name: true } } } },
        trainer: { include: { user: { select: { name: true } } } },
        days: { include: { exercises: { orderBy: { order: "asc" } } }, orderBy: { dayNumber: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(programs);
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
    const parsed = programSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { days, startDate, endDate, isTemplate, memberId, ...rest } = parsed.data;

    const program = await prisma.workoutProgram.create({
      data: {
        ...rest,
        trainerId,
        memberId: memberId ?? null as string | null,
        isTemplate: isTemplate || !memberId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        days: {
          create: days.map(({ exercises, ...day }) => ({
            ...day,
            exercises: { create: exercises },
          })),
        },
      },
      include: {
        days: { include: { exercises: { orderBy: { order: "asc" } } }, orderBy: { dayNumber: "asc" } },
        member: { include: { user: { select: { name: true } } } },
      },
    });

    return NextResponse.json(program, { status: 201 });
  } catch (e) {
    console.error("[programs POST]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
