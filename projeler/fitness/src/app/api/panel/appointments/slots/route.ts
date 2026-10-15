import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { AppointmentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireUser();

    const sp = req.nextUrl.searchParams;
    const trainerId = sp.get("trainerId");
    const date = sp.get("date"); // YYYY-MM-DD
    const durationMin = parseInt(sp.get("duration") ?? "60", 10);

    if (!trainerId || !date) {
      return NextResponse.json({ error: "trainerId ve date zorunlu" }, { status: 400 });
    }

    const d = new Date(date);
    if (d < new Date(new Date().setHours(0, 0, 0, 0))) {
      return NextResponse.json({ slots: [], reason: "Geçmiş tarih seçilemez" });
    }

    const jsDow = d.getDay();
    const schemaDow = jsDow === 0 ? 6 : jsDow - 1;

    const avail = await prisma.trainerAvailability.findFirst({
      where: { trainerId, dayOfWeek: schemaDow },
    });

    if (!avail) return NextResponse.json({ slots: [], reason: "Bu gün antrenör müsait değil" });

    const timeOffDayStart = new Date(d); timeOffDayStart.setHours(0, 0, 0, 0);
    const timeOffDayEnd = new Date(d); timeOffDayEnd.setHours(23, 59, 59, 999);
    const timeOff = await prisma.trainerTimeOff.findFirst({
      where: { trainerId, startDate: { lte: timeOffDayEnd }, endDate: { gte: timeOffDayStart } },
    });
    if (timeOff) return NextResponse.json({ slots: [], reason: "Antrenör bu tarihte izinli" });

    const [startH, startM] = avail.startTime.split(":").map(Number);
    const [endH, endM] = avail.endTime.split(":").map(Number);
    const windowStart = startH * 60 + startM;
    const windowEnd = endH * 60 + endM;

    const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);

    const existing = await prisma.appointment.findMany({
      where: {
        trainerId,
        status: AppointmentStatus.SCHEDULED,
        startAt: { gte: dayStart, lte: dayEnd },
      },
      select: { startAt: true, endAt: true },
    });

    const bookedMinutes = existing.map((a) => ({
      start: a.startAt.getHours() * 60 + a.startAt.getMinutes(),
      end: a.endAt.getHours() * 60 + a.endAt.getMinutes(),
    }));

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const nowMinutes = isToday ? now.getHours() * 60 + now.getMinutes() + 60 : 0;

    const slots: string[] = [];
    for (let t = windowStart; t + durationMin <= windowEnd; t += durationMin) {
      if (isToday && t <= nowMinutes) continue;
      const slotEnd = t + durationMin;
      const conflict = bookedMinutes.some((b) => t < b.end && slotEnd > b.start);
      if (!conflict) {
        const h = Math.floor(t / 60);
        const m = t % 60;
        slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }

    return NextResponse.json({ slots, availWindow: `${avail.startTime}–${avail.endTime}` });
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
}
