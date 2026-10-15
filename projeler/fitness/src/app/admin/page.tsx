import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fetchStats } from "@/lib/stats";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { Users, UserPlus, ArrowRight } from "lucide-react";
import { formatTRY, formatDate, initials } from "@/lib/utils";

export default async function AdminDashboard() {
  const [branches, recentMembers, recentPayments, initialStats] = await Promise.all([
    prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.member.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true, avatarUrl: true } } },
    }),
    prisma.payment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { member: { include: { user: { select: { name: true } } } } },
    }),
    fetchStats(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Genel Bakış</h1>
          <p className="text-sm text-label mt-1">
            {new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/uyeler" className="btn-secondary btn-md"><Users className="w-4 h-4" />Üyeleri Yönet</Link>
          <Link href="/admin/uyeler" className="btn-primary btn-md"><UserPlus className="w-4 h-4" />Yeni Üye</Link>
        </div>
      </div>

      <DashboardStats branches={branches} initialData={initialStats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-surface p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">Son Kayıt Olan Üyeler</div>
            <Link href="/admin/uyeler" className="text-xs text-neon hover:underline inline-flex items-center gap-1">
              Tümü <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-1">
            {recentMembers.length === 0 && <div className="text-sm text-muted py-6 text-center">Henüz üye yok</div>}
            {recentMembers.map((m) => (
              <Link
                key={m.id}
                href={`/admin/uyeler/${m.id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-subtle"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-neon to-accent-cyan grid place-items-center text-ink-950 text-xs font-bold">
                  {initials(m.user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.user.name}</div>
                  <div className="text-xs text-label truncate">{m.user.email}</div>
                </div>
                <div className="text-xs text-muted">{formatDate(m.createdAt)}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card-surface p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold">Son Ödemeler</div>
            <Link href="/admin/odemeler" className="text-xs text-neon hover:underline inline-flex items-center gap-1">
              Tümü <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-1">
            {recentPayments.length === 0 && <div className="text-sm text-muted py-6 text-center">Henüz ödeme yok</div>}
            {recentPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-subtle">
                <div>
                  <div className="text-sm font-medium">{p.member.user.name}</div>
                  <div className="text-xs text-label">{p.invoiceNo || "—"}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-neon">{formatTRY(Number(p.amount))}</div>
                  <div className="text-[10px] text-muted">{formatDate(p.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
