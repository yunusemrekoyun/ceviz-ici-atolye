import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  trainerId: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  capacity: z.number().int().min(1).optional(),
  durationMin: z.number().int().optional(),
  color: z.string().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  status: z.enum(["SCHEDULED", "CANCELLED", "COMPLETED"]).optional(),
  isPublished: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const groupClass = await prisma.groupClass.findUnique({
    where: { id },
    include: {
      trainer: { include: { user: { select: { name: true } } } },
      bookings: {
        include: { member: { include: { user: { select: { name: true } } } } },
        orderBy: { bookedAt: "asc" },
      },
    },
  });
  if (!groupClass) return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 });
  return NextResponse.json(groupClass);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { startAt, endAt, ...rest } = parsed.data;
    const updated = await prisma.groupClass.update({
      where: { id },
      data: {
        ...rest,
        ...(startAt ? { startAt: new Date(startAt) } : {}),
        ...(endAt ? { endAt: new Date(endAt) } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    await prisma.groupClass.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
