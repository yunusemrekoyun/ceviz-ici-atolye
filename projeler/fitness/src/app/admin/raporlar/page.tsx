import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { RevenueChartLazy as RevenueChart } from "@/components/admin/RevenueChartLazy";
import { TrendingUp, Users, Activity, BarChart3 } from "lucide-react";
import { PrintButton } from "@/components/admin/PrintButton";
import { formatTRY } from "@/lib/utils";
import { PaymentStatus } from "@prisma/client";

export default async function ReportsPage() {
  const now = new Date();
  const startOfMonth  = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth     = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const start12       = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const endNext       = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  type MonthRow    = { month: Date; revenue: number };
  type TopPlanRow  = { name: string; count: bigint };

  const [
    totalRevenueAgg,
    lastMonthRevenueAgg,
    totalMembers,
    totalAttendance,
    monthRows,
    topPlanRows,
  ] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: PaymentStatus.PAID } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: PaymentStatus.PAID, paidAt: { gte: lastMonth, lt: startOfMonth } } }),
    prisma.member.count(),
    prisma.attendance.count(),
    // Son 12 ay gelir — tek GROUP BY sorgusu
    prisma.$queryRaw<MonthRow[]>`
      SELECT DATE_TRUNC('month', "paidAt") AS month,
             CAST(COALESCE(SUM(amount), 0) AS FLOAT8) AS revenue
      FROM "Payment"
      WHERE status = ${PaymentStatus.PAID}::"PaymentStatus"
        AND "paidAt" >= ${start12}
        AND "paidAt" < ${endNext}
      GROUP BY 1 ORDER BY 1
    `,
    // Popüler planlar — tek JOIN sorgusu
    prisma.$queryRaw<TopPlanRow[]>`
      SELECT pl.name, COUNT(*) AS count
      FROM "Membership" ms
      JOIN "Plan" pl ON ms."planId" = pl.id
      GROUP BY pl.id, pl.name
      ORDER BY count DESC
      LIMIT 5
    `,
  ]);

  // Eksik ayları 0 ile doldur
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

  const topPlans = topPlanRows.map((r) => ({ name: r.name, count: Number(r.count) }));
  const maxCount = Math.max(...topPlans.map((p) => p.count), 1);

  return (
    <div>
      <PageHeader
        title="Raporlar & Analitik"
        subtitle="Detaylı performans göstergeleri ve finansal raporlar"
        actions={<PrintButton />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Toplam Ciro"    value={formatTRY(Number(totalRevenueAgg._sum.amount || 0))}       icon={TrendingUp} accent="neon" />
        <StatCard label="Geçen Ay"       value={formatTRY(Number(lastMonthRevenueAgg._sum.amount || 0))}   icon={BarChart3}  accent="cyan" />
        <StatCard label="Toplam Üye"     value={String(totalMembers)}                                       icon={Users}      accent="violet" />
        <StatCard label="Toplam Check-in" value={String(totalAttendance)}                                   icon={Activity}   accent="amber" />
      </div>

      <div className="card-surface p-6 mb-6">
        <div className="font-semibold mb-4">Aylık Gelir (Son 12 Ay)</div>
        <RevenueChart data={monthly} />
      </div>

      <div className="card-surface p-6">
        <div className="font-semibold mb-4">En Popüler Planlar</div>
        <div className="space-y-3">
          {topPlans.length === 0 && <div className="text-muted text-sm">Veri yok</div>}
          {topPlans.map((p, i) => (
            <div key={p.name}>
              <div className="flex justify-between text-sm mb-1.5">
                <span>#{i + 1} {p.name}</span>
                <span className="text-neon font-semibold">{p.count} üye</span>
              </div>
              <div className="h-2 rounded-full bg-subtle overflow-hidden">
                <div className="h-full bg-gradient-to-r from-neon to-accent-cyan" style={{ width: `${(p.count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
