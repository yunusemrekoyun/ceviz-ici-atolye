import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { AppointmentStatus, PaymentStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  await requireAdmin();

  const sp = req.nextUrl.searchParams;
  const branchId = sp.get("branchId") || undefined;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const trainers = await prisma.trainer.findMany({
    where: { isActive: true },
    include: {
      user: { select: { name: true, avatarUrl: true } },
      members: {
        where: branchId ? { branchId } : {},
        select: { id: true },
      },
      appointments: {
        where: { startAt: { gte: startOfMonth } },
        select: { status: true },
      },
    },
  });

  // Total revenue contributed via trainer's members this month
  const trainerStats = await Promise.all(
    trainers.map(async (t) => {
      const memberIds = t.members.map((m) => m.id);
      const revenueAgg = await prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: PaymentStatus.PAID,
          paidAt: { gte: startOfMonth },
          memberId: { in: memberIds },
        },
      });
      const revenue = Number(revenueAgg._sum.amount || 0);
      const completed = t.appointments.filter((a) => a.status === AppointmentStatus.COMPLETED).length;
      const scheduled = t.appointments.filter((a) => a.status === AppointmentStatus.SCHEDULED).length;

      return {
        id: t.id,
        name: t.user.name,
        avatarUrl: t.user.avatarUrl,
        specialty: t.specialty,
        rating: t.rating,
        memberCount: t.members.length,
        appointmentsCompleted: completed,
        appointmentsScheduled: scheduled,
        revenueThisMonth: revenue,
      };
    })
  );

  const totals = trainerStats.reduce(
    (acc, t) => ({
      appointments: acc.appointments + t.appointmentsCompleted,
      revenue: acc.revenue + t.revenueThisMonth,
    }),
    { appointments: 0, revenue: 0 }
  );

  return NextResponse.json({ trainers: trainerStats, totals });
}
