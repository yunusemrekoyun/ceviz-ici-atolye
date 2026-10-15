import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

interface EntryInput {
  name?: unknown;
  done?: unknown;
  weightKg?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { dayId, notes, entries } = await req.json();

    if (typeof dayId !== "string" || !dayId) {
      return NextResponse.json({ error: "dayId gerekli" }, { status: 400 });
    }

    const member = await prisma.member.findUnique({ where: { userId: user.sub } });
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    const day = await prisma.workoutDay.findFirst({
      where: { id: dayId, program: { memberId: member.id, isActive: true } },
      include: { program: { select: { id: true, title: true } } },
    });
    if (!day) return NextResponse.json({ error: "Program günü bulunamadı" }, { status: 404 });

    // Aynı gün için günde bir kayıt yeter — yanlışlıkla çift dokunuşu engelle.
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const existing = await prisma.workoutSession.findFirst({
      where: { memberId: member.id, dayId, completedAt: { gte: todayStart } },
    });
    if (existing) {
      return NextResponse.json({ error: "Bu antrenmanı bugün zaten kaydettin" }, { status: 400 });
    }

    const cleanEntries = Array.isArray(entries)
      ? (entries as EntryInput[])
          .filter((e) => typeof e.name === "string" && e.name)
          .slice(0, 50)
          .map((e, i) => ({
            name: String(e.name).slice(0, 200),
            done: e.done !== false,
            weightKg: e.weightKg != null && Number(e.weightKg) > 0 ? Number(e.weightKg) : null,
            order: i,
          }))
      : [];

    const session = await prisma.workoutSession.create({
      data: {
        memberId: member.id,
        programId: day.program.id,
        dayId,
        programTitle: day.program.title,
        dayLabel: day.label,
        notes: typeof notes === "string" && notes.trim() ? notes.trim().slice(0, 500) : null,
        entries: { create: cleanEntries },
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (e) {
    console.error("[panel/workouts POST]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
