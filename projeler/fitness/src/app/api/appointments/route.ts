import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { AppointmentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  await requireAdmin();

  const sp = req.nextUrl.searchParams;
  const trainerId = sp.get("trainerId") || undefined;
  const memberId = sp.get("memberId") || undefined;
  const status = sp.get("status") as AppointmentStatus | null;
  const date = sp.get("date"); // YYYY-MM-DD
  const upcoming = sp.get("upcoming") === "1";

  const now = new Date();
  let dateFilter: any = undefined;
  if (date) {
    const d = new Date(date);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    dateFilter = { gte: d, lt: next };
  } else if (upcoming) {
    dateFilter = { gte: now };
  }

  const appointments = await prisma.appointment.findMany({
    where: {
      ...(trainerId ? { trainerId } : {}),
      ...(memberId ? { memberId } : {}),
      ...(status ? { status } : {}),
      ...(dateFilter ? { startAt: dateFilter } : {}),
    },
    include: {
      member: { include: { user: { select: { name: true, avatarUrl: true } } } },
      trainer: { include: { user: { select: { name: true, avatarUrl: true } } } },
    },
    orderBy: { startAt: "asc" },
    take: 100,
  });

  return NextResponse.json(appointments);
}

export async function POST(req: NextRequest) {
  await requireAdmin();

  const { memberId, trainerId, startAt, durationMin = 60, notes } = await req.json();
  if (!memberId || !trainerId || !startAt) {
    return NextResponse.json({ error: "memberId, trainerId ve startAt zorunlu" }, { status: 400 });
  }

  const start = new Date(startAt);
  const end = new Date(start.getTime() + durationMin * 60_000);

  // Çakışma kontrolü
  const conflict = await prisma.appointment.findFirst({
    where: {
      trainerId,
      status: { in: [AppointmentStatus.SCHEDULED] },
      OR: [
        { startAt: { gte: start, lt: end } },
        { endAt: { gt: start, lte: end } },
        { startAt: { lte: start }, endAt: { gte: end } },
      ],
    },
  });
  if (conflict) {
    return NextResponse.json({ error: "Eğitmen bu saatte başka randevusu var" }, { status: 409 });
  }

  const appointment = await prisma.appointment.create({
    data: { memberId, trainerId, startAt: start, endAt: end, notes, status: AppointmentStatus.SCHEDULED },
    include: {
      member: { include: { user: { select: { name: true } } } },
      trainer: { include: { user: { select: { name: true } } } },
    },
  });

  return NextResponse.json(appointment, { status: 201 });
}
