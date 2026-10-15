"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { X, TrendingDown, TrendingUp, Minus, Camera } from "lucide-react";
import { formatDate } from "@/lib/utils";

const MemberProgressChart = dynamic(() => import("@/components/admin/MemberProgressChart"), {
  ssr: false,
  loading: () => <div className="h-[220px] animate-pulse rounded-xl bg-subtle" />,
});

interface Measurement {
  id: string;
  recordedAt: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  musclePct: number | null;
  waistCm: number | null;
  chestCm: number | null;
  hipCm: number | null;
}

interface ProgressPhoto {
  id: string;
  imageUrl: string;
  takenAt: string;
}

interface Props {
  measurements: Measurement[];
  photos: ProgressPhoto[];
}

type MetricKey = "weightKg" | "bodyFatPct" | "musclePct" | "waistCm";
const METRICS: { key: MetricKey; label: string; unit: string; color: string }[] = [
  { key: "weightKg",   label: "Kilo",  unit: "kg", color: "#C6FF3D" },
  { key: "bodyFatPct", label: "Yağ %", unit: "%",  color: "#f97316" },
  { key: "musclePct",  label: "Kas %", unit: "%",  color: "#22d3ee" },
  { key: "waistCm",    label: "Bel",   unit: "cm", color: "#a78bfa" },
];

function delta(measurements: Measurement[], key: MetricKey) {
  const vals = measurements.map((m) => m[key]).filter((v) => v !== null) as number[];
  if (vals.length < 2) return null;
  return +(vals[vals.length - 1] - vals[0]).toFixed(1);
}

function DeltaIcon({ v }: { v: number | null }) {
  if (v === null) return <span className="text-faint">—</span>;
  if (v < 0) return <span className="text-emerald-400 flex items-center gap-1"><TrendingDown className="w-3 h-3" />{v}</span>;
  if (v > 0) return <span className="text-amber-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" />+{v}</span>;
  return <span className="text-muted flex items-center gap-1"><Minus className="w-3 h-3" />0</span>;
}

export function TrainerMemberProgress({ measurements, photos }: Props) {
  const [tab, setTab] = useState<"olcumler" | "fotograflar">("olcumler");
  const [lightbox, setLightbox] = useState<ProgressPhoto | null>(null);

  const chartData = measurements.map((m) => ({
    date: new Date(m.recordedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
    weightKg: m.weightKg,
    bodyFatPct: m.bodyFatPct,
    musclePct: m.musclePct,
    waistCm: m.waistCm,
  }));

  if (measurements.length === 0 && photos.length === 0) return null;

  return (
    <div className="card-surface p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="font-semibold">Ölçüm & Gelişim Takibi</div>
        <div className="flex rounded-lg bg-subtle p-0.5 text-sm">
          <button onClick={() => setTab("olcumler")}
            className={`px-3 py-1 rounded-md transition-colors ${tab === "olcumler" ? "bg-subtle-md text-white" : "text-label hover:text-white"}`}>
            Ölçümler
          </button>
          <button onClick={() => setTab("fotograflar")}
            className={`px-3 py-1 rounded-md transition-colors ${tab === "fotograflar" ? "bg-subtle-md text-white" : "text-label hover:text-white"}`}>
            Fotoğraflar
          </button>
        </div>
      </div>

      {tab === "fotograflar" ? (
        photos.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-subtle-md rounded-xl">
            <Camera className="w-7 h-7 text-white/20 mx-auto mb-2" />
            <div className="text-sm text-faint">Henüz fotoğraf yok</div>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={p.imageUrl}
                alt=""
                onClick={() => setLightbox(p)}
                className="rounded-xl overflow-hidden aspect-square bg-subtle object-cover cursor-pointer hover:opacity-80 transition-opacity"
              />
            ))}
          </div>
        )
      ) : measurements.length === 0 ? (
        <div className="text-center py-8 text-faint text-sm">Henüz ölçüm kaydı yok</div>
      ) : (
        <>
          {measurements.length >= 2 && (
            <div className="grid grid-cols-4 gap-3">
              {METRICS.map(({ key, label, unit }) => {
                const d = delta(measurements, key);
                const last = measurements[measurements.length - 1][key];
                return (
                  <div key={key} className="rounded-xl bg-subtle p-3 text-center">
                    <div className="text-[10px] text-label uppercase tracking-wider">{label}</div>
                    <div className="text-lg font-bold mt-1">{last != null ? `${last}${unit}` : "—"}</div>
                    <div className="text-xs mt-0.5"><DeltaIcon v={d} /></div>
                  </div>
                );
              })}
            </div>
          )}

          {measurements.length > 1 && (
            <MemberProgressChart
              data={chartData}
              lines={METRICS.map(({ key, label, color }) => ({ key, label, color }))}
            />
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-subtle">
                  <th className="text-left py-2 text-muted font-medium">Tarih</th>
                  <th className="text-right py-2 text-muted font-medium">Kilo</th>
                  <th className="text-right py-2 text-muted font-medium">Yağ %</th>
                  <th className="text-right py-2 text-muted font-medium">Kas %</th>
                  <th className="text-right py-2 text-muted font-medium">Bel cm</th>
                </tr>
              </thead>
              <tbody>
                {[...measurements].reverse().map((m) => (
                  <tr key={m.id} className="border-b border-subtle">
                    <td className="py-2 text-body">{formatDate(m.recordedAt)}</td>
                    <td className="py-2 text-right font-mono">{m.weightKg ?? "—"}</td>
                    <td className="py-2 text-right font-mono">{m.bodyFatPct ?? "—"}</td>
                    <td className="py-2 text-right font-mono">{m.musclePct ?? "—"}</td>
                    <td className="py-2 text-right font-mono">{m.waistCm ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)} className="absolute -top-10 right-0 text-body hover:text-white"><X className="w-5 h-5" /></button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.imageUrl} alt="" className="w-full rounded-2xl" />
            <div className="mt-3 text-sm text-body text-center">
              {new Date(lightbox.takenAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
