import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { z } from "zod";

const classSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  trainerId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  capacity: z.number().int().min(1).max(200).default(20),
  durationMin: z.number().int().min(15).max(480).default(60),
  color: z.string().default("#C6FF3D"),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  isPublished: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
  recurringDay: z.number().int().min(0).max(6).optional().nullable(),
});

// GET — herkese açık (üye veya admin)
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const branchId = searchParams.get("branchId");

    const classes = await prisma.groupClass.findMany({
      where: {
        status: { not: "CANCELLED" },
        ...(from ? { startAt: { gte: new Date(from) } } : {}),
        ...(to ? { startAt: { lte: new Date(to) } } : {}),
        ...(branchId ? { branchId } : {}),
      },
      include: {
        trainer: { include: { user: { select: { name: true } } } },
        _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
      },
      orderBy: { startAt: "asc" },
    });

    return NextResponse.json(classes);
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
}

// POST — sadece admin/staff
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const parsed = classSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { startAt, endAt, ...rest } = parsed.data;
    const groupClass = await prisma.groupClass.create({
      data: {
        ...rest,
        startAt: new Date(startAt),
        endAt: new Date(endAt),
      },
    });

    return NextResponse.json(groupClass, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
