"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Users, Activity, AlertCircle, TrendingUp, CheckSquare, UserPlus } from "lucide-react";
import { StatCard } from "./StatCard";
import { formatTRY } from "@/lib/utils";
import type { StatsData } from "@/lib/stats";

const RevenueChart = dynamic(
  () => import("./RevenueChart").then((m) => ({ default: m.RevenueChart })),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded-xl bg-subtle" /> }
);

interface Branch {
  id: string;
  name: string;
}

interface Props {
  branches: Branch[];
  initialData: StatsData;
}

export function DashboardStats({ branches, initialData }: Props) {
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<StatsData>(initialData);
  const [loading, setLoading] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    // İlk render'da skip — server'dan gelen initialData kullanılıyor
    if (!mounted.current) { mounted.current = true; return; }
    setLoading(true);
    const url = branchId ? `/api/stats?branchId=${branchId}` : "/api/stats";
    fetch(url)
      .then((r) => r.json())
      .then((d: StatsData) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [branchId]);

  const t = data.totals;

  return (
    <div className="space-y-4">
      {branches.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-label">Şube:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setBranchId("")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${branchId === "" ? "bg-neon text-ink-950" : "bg-subtle text-body hover:bg-subtle-md"}`}
            >
              Tümü
            </button>
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => setBranchId(b.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${branchId === b.id ? "bg-neon text-ink-950" : "bg-subtle text-body hover:bg-subtle-md"}`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity ${loading ? "opacity-50" : "opacity-100"}`}>
        <StatCard label="Toplam Üye"             value={String(t.members)}          delta={t.membersDelta} icon={Users}       accent="neon" />
        <StatCard label="Aktif Üye"              value={String(t.active)}            icon={Activity}        accent="cyan" />
        <StatCard label="Aylık Gelir"            value={formatTRY(t.monthRevenue)}  delta={t.revenueDelta}  icon={TrendingUp}  accent="violet" />
        <StatCard label="7 Gün İçinde Sona Eren" value={String(t.expiring)}          icon={AlertCircle}     accent="amber" hint="Yenileme uyarısı gönder" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-surface p-6 lg:col-span-2">
          <div className="flex items-end justify-between mb-4">
            <div>
              <div className="text-sm text-body">Gelir Trendi</div>
              <div className="text-2xl font-bold mt-1">Son 12 Ay</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted">Bu ay</div>
              <div className="text-lg font-semibold text-neon">{formatTRY(t.monthRevenue)}</div>
            </div>
          </div>
          <RevenueChart data={data.monthly} />
        </div>

        <div className="card-surface p-6">
          <div className="text-sm text-body">Bugün</div>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-body">
                <CheckSquare className="w-3.5 h-3.5" /> Check-in
              </div>
              <div className="text-2xl font-bold">{t.todayCheckIns}</div>
            </div>
            <div className="h-px bg-subtle" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-body">
                <UserPlus className="w-3.5 h-3.5" /> Yeni üye (bu ay)
              </div>
              <div className="text-2xl font-bold text-neon">+{t.newThisMonth}</div>
            </div>
            <div className="h-px bg-subtle" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-body">
                <AlertCircle className="w-3.5 h-3.5" /> Yenileme bekleyen
              </div>
              <div className="text-2xl font-bold text-amber-300">{t.expiring}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
