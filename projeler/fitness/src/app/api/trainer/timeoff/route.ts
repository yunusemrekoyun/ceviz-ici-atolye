import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTrainer } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireTrainer();
    const trainer = await prisma.trainer.findUnique({ where: { userId: user.sub } });
    if (!trainer) return NextResponse.json({ error: "Eğitmen kaydı bulunamadı" }, { status: 404 });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const items = await prisma.trainerTimeOff.findMany({
      where: { trainerId: trainer.id, endDate: { gte: todayStart } },
      orderBy: { startDate: "asc" },
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error("[trainer/timeoff GET]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireTrainer();
    const trainer = await prisma.trainer.findUnique({ where: { userId: user.sub } });
    if (!trainer) return NextResponse.json({ error: "Eğitmen kaydı bulunamadı" }, { status: 404 });

    const { startDate, endDate, reason } = await req.json();
    if (typeof startDate !== "string" || typeof endDate !== "string") {
      return NextResponse.json({ error: "Başlangıç ve bitiş tarihi gerekli" }, { status: 400 });
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59.999`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return NextResponse.json({ error: "Geçersiz tarih aralığı" }, { status: 400 });
    }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (end < todayStart) {
      return NextResponse.json({ error: "Geçmiş bir tarih aralığı eklenemez" }, { status: 400 });
    }

    const item = await prisma.trainerTimeOff.create({
      data: {
        trainerId: trainer.id,
        startDate: start,
        endDate: end,
        reason: typeof reason === "string" && reason.trim() ? reason.trim().slice(0, 200) : null,
      },
    });

    // O aralıktaki planlanmış randevu sayısını da döndür — eğitmen görüp
    // gerekiyorsa tek tek iptal etsin (otomatik iptal etmeyiz, üyeye haksızlık olur).
    const affected = await prisma.appointment.count({
      where: { trainerId: trainer.id, status: "SCHEDULED", startAt: { gte: start, lte: end } },
    });

    return NextResponse.json({ item, affectedAppointments: affected }, { status: 201 });
  } catch (e) {
    console.error("[trainer/timeoff POST]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
