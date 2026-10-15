import { prisma } from "@/lib/prisma";
import { MemberStatus, PaymentStatus } from "@prisma/client";

export interface StatsData {
  totals: {
    members: number;
    active: number;
    expiring: number;
    todayCheckIns: number;
    monthRevenue: number;
    newThisMonth: number;
    revenueDelta: number;
    membersDelta: number;
  };
  monthly: { month: string; revenue: number }[];
}

export async function fetchStats(branchId?: string): Promise<StatsData> {
  const now = new Date();
  const startOfMonth     = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfDay       = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const in7Days          = new Date(now);
  in7Days.setDate(in7Days.getDate() + 7);

  const branchFilter        = branchId ? { branchId } : {};
  const memberRevenueFilter = branchId ? { member: { branchId } } : {};

  const [
    totalMembers,
    activeMembers,
    expiringMemberships,
    todayCheckIns,
    monthRevenue,
    prevMonthRevenue,
    newThisMonth,
    newLastMonth,
  ] = await Promise.all([
    prisma.member.count({ where: branchFilter }),
    prisma.member.count({ where: { status: MemberStatus.ACTIVE, ...branchFilter } }),
    prisma.membership.count({
      where: {
        isActive: true,
        endDate: { gte: now, lte: in7Days },
        ...(branchId ? { member: { branchId } } : {}),
      },
    }),
    prisma.attendance.count({ where: { checkIn: { gte: startOfDay }, ...branchFilter } }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: PaymentStatus.PAID, paidAt: { gte: startOfMonth }, ...memberRevenueFilter },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: PaymentStatus.PAID, paidAt: { gte: startOfPrevMonth, lt: startOfMonth }, ...memberRevenueFilter },
    }),
    prisma.member.count({ where: { createdAt: { gte: startOfMonth }, ...branchFilter } }),
    prisma.member.count({ where: { createdAt: { gte: startOfPrevMonth, lt: startOfMonth }, ...branchFilter } }),
  ]);

  const currentRevenue  = Number(monthRevenue._sum.amount || 0);
  const previousRevenue = Number(prevMonthRevenue._sum.amount || 0);
  const revenueDelta = previousRevenue > 0
    ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100) : 0;
  const membersDelta = newLastMonth > 0
    ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100) : 0;

  // Son 12 ay — tek GROUP BY sorgusu
  const start12  = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const endNext  = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  type MonthRow = { month: Date; revenue: number };
  const monthRows: MonthRow[] = branchId
    ? await prisma.$queryRaw<MonthRow[]>`
        SELECT DATE_TRUNC('month', p."paidAt") AS month,
               CAST(COALESCE(SUM(p.amount), 0) AS FLOAT8) AS revenue
        FROM "Payment" p
        JOIN "Member" m ON p."memberId" = m.id
        WHERE p.status = ${PaymentStatus.PAID}::"PaymentStatus"
          AND p."paidAt" >= ${start12}
          AND p."paidAt" < ${endNext}
          AND m."branchId" = ${branchId}
        GROUP BY 1 ORDER BY 1
      `
    : await prisma.$queryRaw<MonthRow[]>`
        SELECT DATE_TRUNC('month', "paidAt") AS month,
               CAST(COALESCE(SUM(amount), 0) AS FLOAT8) AS revenue
        FROM "Payment"
        WHERE status = ${PaymentStatus.PAID}::"PaymentStatus"
          AND "paidAt" >= ${start12}
          AND "paidAt" < ${endNext}
        GROUP BY 1 ORDER BY 1
      `;

  const revenueByMonth = new Map(
    monthRows.map((r) => [new Date(r.month).toISOString().slice(0, 7), r.revenue])
  );
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    return {
      month: d.toLocaleDateString("tr-TR", { month: "short" }),
      revenue: revenueByMonth.get(d.toISOString().slice(0, 7)) ?? 0,
    };
  });

  return {
    totals: {
      members: totalMembers,
      active: activeMembers,
      expiring: expiringMemberships,
      todayCheckIns,
      monthRevenue: currentRevenue,
      newThisMonth,
      revenueDelta,
      membersDelta,
    },
    monthly,
  };
}
