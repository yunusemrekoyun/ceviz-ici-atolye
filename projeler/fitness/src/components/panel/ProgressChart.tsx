"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingDown, TrendingUp, Minus, Target } from "lucide-react";

interface Measurement {
  id: string;
  recordedAt: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  musclePct: number | null;
  waistCm: number | null;
}

type MetricKey = "weightKg" | "bodyFatPct" | "musclePct";
const METRICS: { key: MetricKey; label: string; unit: string; color: string }[] = [
  { key: "weightKg",   label: "Kilo",  unit: "kg", color: "#C6FF3D" },
  { key: "bodyFatPct", label: "Yağ %", unit: "%",  color: "#f97316" },
  { key: "musclePct",  label: "Kas %", unit: "%",  color: "#22d3ee" },
];

interface Props {
  initialMeasurements: Measurement[];
  targetWeightKg?: number | null;
  startWeightKg?: number | null;
}

export function ProgressChart({ initialMeasurements, targetWeightKg, startWeightKg }: Props) {
  const [active, setActive] = useState<MetricKey>("weightKg");

  if (initialMeasurements.length < 2) return null;

  const first = initialMeasurements[0];
  const last = initialMeasurements[initialMeasurements.length - 1];

  const chartData = initialMeasurements.map((m) => ({
    date: new Date(m.recordedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
    value: m[active],
  }));

  const metric = METRICS.find((m) => m.key === active)!;
  const d = last[active] != null && first[active] != null
    ? +(Number(last[active]) - Number(first[active])).toFixed(1)
    : null;

  // Hedef kilo ilerlemesi: başlangıç → güncel → hedef arasında yüzde.
  const currentWeight = last.weightKg;
  const startW = startWeightKg ?? first.weightKg;
  let goalPct: number | null = null;
  if (targetWeightKg != null && currentWeight != null && startW != null && startW !== targetWeightKg) {
    goalPct = Math.round(((startW - currentWeight) / (startW - targetWeightKg)) * 100);
    goalPct = Math.max(0, Math.min(100, goalPct));
  }
  const goalReached = goalPct === 100;

  return (
    <div className="card-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm text-body">Gelişim Grafiği</div>
          <div className="text-xl font-bold mt-0.5">
            {last[active] != null ? `${last[active]} ${metric.unit}` : "—"}
            {d !== null && (
              <span className={`ml-2 text-sm font-normal ${d < 0 ? "text-emerald-400" : d > 0 ? "text-amber-400" : "text-muted"}`}>
                {d < 0 ? <TrendingDown className="w-4 h-4 inline" /> : d > 0 ? <TrendingUp className="w-4 h-4 inline" /> : <Minus className="w-4 h-4 inline" />}
                {" "}{d > 0 ? "+" : ""}{d} {metric.unit}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setActive(m.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                active === m.key ? "text-ink-950" : "bg-subtle text-label hover:bg-subtle-md"
              }`}
              style={active === m.key ? { backgroundColor: m.color } : {}}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {active === "weightKg" && goalPct !== null && targetWeightKg != null && (
        <div className="mb-4 rounded-xl bg-subtle p-3.5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="flex items-center gap-1.5 text-body">
              <Target className="w-3.5 h-3.5 text-neon" />
              {goalReached ? "Hedefe ulaştın! 🎉" : `Hedef: ${targetWeightKg} kg`}
            </span>
            <span className="text-muted">%{goalPct}</span>
          </div>
          <div className="h-2 rounded-full bg-subtle-md overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${goalReached ? "bg-emerald-400" : "bg-neon"}`}
              style={{ width: `${goalPct}%` }}
            />
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="date" stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} />
          <YAxis stroke="#ffffff40" fontSize={10} tickLine={false} axisLine={false} width={36} domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{ background: "#11141B", border: "1px solid #ffffff15", borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: "#ffffff80" }}
            formatter={(v: number) => [`${v} ${metric.unit}`, metric.label]}
          />
          {active === "weightKg" && targetWeightKg != null && (
            <ReferenceLine
              y={targetWeightKg}
              stroke="#C6FF3D"
              strokeDasharray="6 4"
              strokeOpacity={0.6}
              label={{ value: "Hedef", position: "insideTopRight", fill: "#C6FF3D", fontSize: 10, opacity: 0.8 }}
            />
          )}
          <Line
            type="monotone" dataKey="value" name={metric.label}
            stroke={metric.color} strokeWidth={2}
            dot={{ r: 3, fill: metric.color }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
