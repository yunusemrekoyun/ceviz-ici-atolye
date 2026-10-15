"use client";

import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

type MetricKey = "weightKg" | "bodyFatPct" | "musclePct" | "waistCm" | "chestCm" | "hipCm" | "armCm" | "legCm";

interface MetricCfg { key: MetricKey; label: string; unit: string; color: string }

interface Props {
  measurements: Record<string, any>[];
  activeMetrics: MetricKey[];
  metrics: MetricCfg[];
}

function pct(val: number | null, base: number | null): number | null {
  if (val == null || base == null || base === 0) return null;
  return +((val - base) / Math.abs(base) * 100).toFixed(2);
}

const CustomTooltip = ({ active, payload, label, metrics, measurements }: any) => {
  if (!active || !payload?.length) return null;
  const idx = measurements.findIndex((m: any) =>
    new Date(m.recordedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) === label
  );
  const raw = idx >= 0 ? measurements[idx] : null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0B0D12]/95 backdrop-blur p-3 text-xs space-y-1.5 shadow-xl min-w-[140px]">
      <div className="text-white/50 font-medium mb-2">{label}</div>
      {payload.map((p: any) => {
        const cfg = metrics.find((m: MetricCfg) => m.key === p.dataKey);
        if (!cfg) return null;
        const rawVal = raw?.[cfg.key];
        return (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
              <span style={{ color: cfg.color }}>{cfg.label}</span>
            </span>
            <span className="font-semibold tabular-nums">
              {rawVal != null ? `${rawVal} ${cfg.unit}` : "—"}
              <span className="font-normal text-white/40 ml-1">
                ({p.value > 0 ? "+" : ""}{p.value}%)
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default function IlerlemeLineChart({ measurements, activeMetrics, metrics }: Props) {
  if (measurements.length < 2) return null;

  // baseline = her metriğin ilk ölçümdeki değeri
  const baselines: Partial<Record<MetricKey, number | null>> = {};
  for (const m of metrics) {
    const first = measurements.find((mes) => mes[m.key] != null);
    baselines[m.key] = first ? first[m.key] : null;
  }

  const data = measurements.map((mes) => {
    const point: Record<string, any> = {
      date: new Date(mes.recordedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
    };
    for (const m of metrics) {
      if (activeMetrics.includes(m.key)) {
        point[m.key] = pct(mes[m.key], baselines[m.key] ?? null);
      }
    }
    return point;
  });

  const primaryKey = activeMetrics[0];
  const primaryCfg = metrics.find((m) => m.key === primaryKey);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          {primaryCfg && (
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primaryCfg.color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={primaryCfg.color} stopOpacity={0} />
            </linearGradient>
          )}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
        <ReferenceLine y={0} stroke="#ffffff20" strokeDasharray="4 4" />
        <XAxis
          dataKey="date" stroke="#ffffff25" fontSize={10}
          tickLine={false} axisLine={false} dy={4}
        />
        <YAxis
          stroke="#ffffff25" fontSize={10} tickLine={false} axisLine={false}
          tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
          domain={["auto", "auto"]}
          width={46}
        />
        <Tooltip
          content={<CustomTooltip metrics={metrics} measurements={measurements} />}
          cursor={{ stroke: "#ffffff15", strokeWidth: 1 }}
        />
        {activeMetrics.map((key, i) => {
          const cfg = metrics.find((m) => m.key === key);
          if (!cfg) return null;
          const isPrimary = i === 0;
          return [
            isPrimary && (
              <Area
                key={`area-${key}`}
                type="monotone" dataKey={key}
                fill="url(#areaGrad)" stroke="none"
                connectNulls
              />
            ),
            <Line
              key={`line-${key}`}
              type="monotone" dataKey={key} name={cfg.label}
              stroke={cfg.color}
              strokeWidth={isPrimary ? 2.5 : 1.5}
              strokeDasharray={isPrimary ? undefined : "5 3"}
              dot={isPrimary ? { r: 3.5, fill: cfg.color, strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: cfg.color, strokeWidth: 0 }}
              connectNulls
            />,
          ];
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
