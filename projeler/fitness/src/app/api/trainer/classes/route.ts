import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTrainer } from "@/lib/auth";
import { z } from "zod";

const classSchema = z.object({
  title:       z.string().min(1),
  description: z.string().optional().nullable(),
  location:    z.string().optional().nullable(),
  capacity:    z.number().int().min(1).max(500).default(20),
  durationMin: z.number().int().min(15).max(480).default(60),
  color:       z.string().default("#C6FF3D"),
  startAt:     z.string().datetime(),
  endAt:       z.string().datetime(),
  isPublished: z.boolean().default(false),
});

async function getTrainer(userId: string) {
  return prisma.trainer.findUnique({ where: { userId } });
}

export async function GET(_req: NextRequest) {
  try {
    const user    = await requireTrainer();
    const trainer = await getTrainer(user.sub);
    if (!trainer) return NextResponse.json({ error: "Eğitmen kaydı bulunamadı" }, { status: 404 });

    const classes = await prisma.groupClass.findMany({
      where: { trainerId: trainer.id, status: { not: "CANCELLED" } },
      include: { _count: { select: { bookings: { where: { status: "CONFIRMED" } } } } },
      orderBy: { startAt: "asc" },
    });

    return NextResponse.json(classes.map((c) => ({ ...c, confirmedCount: c._count.bookings })));
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user    = await requireTrainer();
    const trainer = await getTrainer(user.sub);
    if (!trainer) return NextResponse.json({ error: "Eğitmen kaydı bulunamadı" }, { status: 404 });

    const body   = await req.json();
    const parsed = classSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    const { startAt, endAt, ...rest } = parsed.data;
    const groupClass = await prisma.groupClass.create({
      data: { ...rest, trainerId: trainer.id, startAt: new Date(startAt), endAt: new Date(endAt) },
    });

    return NextResponse.json(groupClass, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
