import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { PaymentStatus, PaymentMethod } from "@prisma/client";

export async function GET(req: NextRequest) {
  await requireAdmin();

  const sp = req.nextUrl.searchParams;
  const branchId = sp.get("branchId") || undefined;
  const days = Math.min(365, Math.max(7, parseInt(sp.get("days") ?? "30", 10)));

  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - days);

  const prevSince = new Date(since);
  prevSince.setDate(prevSince.getDate() - days);

  const memberFilter = branchId ? { member: { branchId } } : {};

  const [current, previous, byMethod] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: PaymentStatus.PAID, paidAt: { gte: since }, ...memberFilter },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: PaymentStatus.PAID, paidAt: { gte: prevSince, lt: since }, ...memberFilter },
    }),
    prisma.payment.groupBy({
      by: ["method"],
      _sum: { amount: true },
      _count: true,
      where: { status: PaymentStatus.PAID, paidAt: { gte: since }, ...memberFilter },
    }),
  ]);

  // Daily data for chart — all queries fired in parallel
  const dayRanges = Array.from({ length: days }, (_, i) => {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i));
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return { dayStart, dayEnd };
  });

  const dailySums = await Promise.all(
    dayRanges.map(({ dayStart, dayEnd }) =>
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: PaymentStatus.PAID, paidAt: { gte: dayStart, lt: dayEnd }, ...memberFilter },
      })
    )
  );

  const dailyData = dailySums.map((sum, i) => ({
    date: dayRanges[i].dayStart.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
    revenue: Number(sum._sum.amount || 0),
  }));

  const currentTotal = Number(current._sum.amount || 0);
  const previousTotal = Number(previous._sum.amount || 0);
  const delta = previousTotal > 0 ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100) : 0;

  const METHOD_LABELS: Record<PaymentMethod, string> = {
    CASH: "Nakit",
    CARD: "Kart",
    TRANSFER: "Transfer",
    STRIPE: "Stripe",
    IYZICO: "iyzico",
    PAYTR: "PayTR",
  };

  return NextResponse.json({
    total: currentTotal,
    delta,
    byMethod: byMethod.map((m) => ({
      method: m.method,
      label: METHOD_LABELS[m.method],
      amount: Number(m._sum.amount || 0),
      count: m._count,
    })),
    daily: dailyData,
  });
}
