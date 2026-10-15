import { dayLabel } from "@/lib/billing-shared";

type Point = { date: string; value: number };

/**
 * Sade çizgi grafik (SVG, sunucuda çizilir). Tarih ekseni gerçek aralıklı; ilk ve son değer etiketli.
 * `reference` verilirse (ör. grup ortalaması) kesikli yatay çizgi olarak gösterilir; etiketi grafiğin dışında verilir
 * (çizgiyle çakışmasın). Tek noktada grafik çizilmez: tek ölçümün eğilimi olmaz.
 */
export function LineChart({ points, unit, decimals = 1, reference, label, color = "var(--color-gs-red)" }: { points: Point[]; unit: string; decimals?: number; reference?: number | null; label: string; color?: string }) {
  if (points.length < 2) return null;
  const W = 320;
  const H = 120;
  const pad = { l: 8, r: 8, t: 18, b: 22 };
  const times = points.map((p) => Date.parse(`${p.date}T12:00:00Z`));
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const vals = points.map((p) => p.value).concat(reference ?? []);
  let v0 = Math.min(...vals);
  let v1 = Math.max(...vals);
  if (v0 === v1) {
    v0 -= 1;
    v1 += 1;
  }
  const span = v1 - v0;
  v0 -= span * 0.15;
  v1 += span * 0.15;
  const x = (t: number) => (t1 === t0 ? W / 2 : pad.l + ((t - t0) / (t1 - t0)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - v0) / (v1 - v0)) * (H - pad.t - pad.b);
  const fmt = (v: number) => v.toFixed(decimals).replace(".", ",");
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(times[i]!).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const first = points[0]!;
  const last = points.at(-1)!;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${label}: ${points.map((p) => `${dayLabel(p.date)} ${fmt(p.value)} ${unit}`).join(", ")}`}>
      {reference != null ? <line x1={pad.l} x2={W - pad.r} y1={y(reference)} y2={y(reference)} stroke="#9ca3af" strokeDasharray="4 4" strokeWidth="1" /> : null}
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(times[i]!)} cy={y(p.value)} r={i === points.length - 1 ? 4.5 : 3} fill={i === points.length - 1 ? color : "#fff"} stroke={color} strokeWidth="2" />
      ))}
      <text x={x(times[0]!)} y={y(first.value) - 8} textAnchor={points.length > 1 ? "start" : "middle"} fontSize="11" fontWeight="600" fill="#1a1a1a">
        {fmt(first.value)}
      </text>
      {points.length > 1 ? (
        <text x={x(times.at(-1)!)} y={y(last.value) - 8} textAnchor="end" fontSize="11" fontWeight="700" fill="#1a1a1a">
          {fmt(last.value)}
        </text>
      ) : null}
      <text x={pad.l} y={H - 6} fontSize="10" fill="#6b7280">
        {dayLabel(first.date, false)}
      </text>
      {points.length > 1 ? (
        <text x={W - pad.r} y={H - 6} textAnchor="end" fontSize="10" fill="#6b7280">
          {dayLabel(last.date, false)}
        </text>
      ) : null}
    </svg>
  );
}
