import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  await requireAdmin();

  const sp = req.nextUrl.searchParams;
  const branchId = sp.get("branchId") || undefined;

  const now = new Date();
  const since30 = new Date(now);
  since30.setDate(since30.getDate() - 30);
  const since7 = new Date(now);
  since7.setDate(since7.getDate() - 7);
  const prev7Start = new Date(since7);
  prev7Start.setDate(prev7Start.getDate() - 7);

  const branchFilter = branchId ? { branchId } : {};

  const [week, prevWeek, allRecent] = await Promise.all([
    prisma.attendance.count({ where: { checkIn: { gte: since7 }, ...branchFilter } }),
    prisma.attendance.count({ where: { checkIn: { gte: prev7Start, lt: since7 }, ...branchFilter } }),
    prisma.attendance.findMany({
      where: { checkIn: { gte: since30 }, ...branchFilter },
      select: { checkIn: true },
    }),
  ]);

  const delta = prevWeek > 0 ? Math.round(((week - prevWeek) / prevWeek) * 100) : 0;

  // Hourly distribution (0-23)
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${h}:00`, count: 0 }));
  for (const a of allRecent) {
    hourly[a.checkIn.getHours()].count++;
  }

  // Daily trend (last 14 days)
  const daily: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = allRecent.filter((a) => a.checkIn >= dayStart && a.checkIn < dayEnd).length;
    daily.push({
      date: dayStart.toLocaleDateString("tr-TR", { weekday: "short", day: "numeric" }),
      count,
    });
  }

  return NextResponse.json({
    week,
    delta,
    hourly,
    daily,
  });
}
