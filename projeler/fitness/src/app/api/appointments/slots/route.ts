import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { AppointmentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  await requireAdmin();

  const sp = req.nextUrl.searchParams;
  const trainerId = sp.get("trainerId");
  const date = sp.get("date"); // YYYY-MM-DD
  const durationMin = parseInt(sp.get("duration") ?? "60", 10);

  if (!trainerId || !date) {
    return NextResponse.json({ error: "trainerId ve date zorunlu" }, { status: 400 });
  }

  const d = new Date(date);
  // 0=Sunday JS → convert to 0=Monday schema
  const jsDow = d.getDay(); // 0=Sun
  const schemaDow = jsDow === 0 ? 6 : jsDow - 1; // 0=Mon…6=Sun

  // Get trainer availability for this day
  const avail = await prisma.trainerAvailability.findFirst({
    where: { trainerId, dayOfWeek: schemaDow },
  });

  if (!avail) return NextResponse.json({ slots: [], reason: "Bu gün müsait değil" });

  // Parse availability window
  const [startH, startM] = avail.startTime.split(":").map(Number);
  const [endH, endM] = avail.endTime.split(":").map(Number);
  const windowStart = startH * 60 + startM;
  const windowEnd = endH * 60 + endM;

  // Get existing appointments for this trainer+day
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

  // Generate slots
  const slots: string[] = [];
  for (let t = windowStart; t + durationMin <= windowEnd; t += durationMin) {
    const slotEnd = t + durationMin;
    const conflict = bookedMinutes.some((b) => t < b.end && slotEnd > b.start);
    if (!conflict) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }

  return NextResponse.json({ slots, availWindow: `${avail.startTime}–${avail.endTime}` });
}
