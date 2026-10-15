import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTrainer } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  title:       z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  location:    z.string().optional().nullable(),
  capacity:    z.number().int().min(1).optional(),
  durationMin: z.number().int().optional(),
  color:       z.string().optional(),
  startAt:     z.string().datetime().optional(),
  endAt:       z.string().datetime().optional(),
  isPublished: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

async function getOwnClass(id: string, userId: string) {
  const trainer = await prisma.trainer.findUnique({ where: { userId } });
  if (!trainer) return null;
  return prisma.groupClass.findFirst({ where: { id, trainerId: trainer.id } });
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const user    = await requireTrainer();
    const { id }  = await ctx.params;
    const cls     = await getOwnClass(id, user.sub);
    if (!cls) return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 });

    const bookings = await prisma.classBooking.findMany({
      where: { classId: id },
      include: { member: { include: { user: { select: { name: true, avatarUrl: true } } } } },
      orderBy: { bookedAt: "asc" },
    });

    return NextResponse.json({ ...cls, bookings });
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user   = await requireTrainer();
    const { id } = await ctx.params;
    const cls    = await getOwnClass(id, user.sub);
    if (!cls) return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 });

    const body   = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    const { startAt, endAt, ...rest } = parsed.data;
    const updated = await prisma.groupClass.update({
      where: { id },
      data: { ...rest, ...(startAt ? { startAt: new Date(startAt) } : {}), ...(endAt ? { endAt: new Date(endAt) } : {}) },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const user   = await requireTrainer();
    const { id } = await ctx.params;
    const cls    = await getOwnClass(id, user.sub);
    if (!cls) return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 });

    await prisma.groupClass.update({ where: { id }, data: { status: "CANCELLED" } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
