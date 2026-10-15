"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Apple, ChevronRight, Droplet } from "lucide-react";

interface Log { kcal: number }

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function NutritionTodayCard({ calorieTarget }: { calorieTarget: number | null }) {
  const [kcal, setKcal] = useState<number | null>(null);
  const [waterMl, setWaterMl] = useState(0);

  useEffect(() => {
    fetch(`/api/panel/nutrition?date=${localToday()}`)
      .then((r) => r.json())
      .then((d) => {
        setKcal(Math.round((d.logs ?? []).reduce((s: number, l: Log) => s + l.kcal, 0)));
        setWaterMl(d.waterMl ?? 0);
      })
      .catch(() => setKcal(0));
  }, []);

  const pct = calorieTarget && kcal != null ? Math.min(100, (kcal / calorieTarget) * 100) : 0;

  return (
    <Link href="/panel/beslenme" className="card-surface p-5 flex items-center gap-4 hover:border-neon/30 transition-colors">
      <div className="w-11 h-11 rounded-xl bg-neon/10 grid place-items-center shrink-0">
        <Apple className="w-5 h-5 text-neon" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">Bugünkü Beslenme</span>
          <ChevronRight className="w-4 h-4 text-muted" />
        </div>
        <div className="mt-1 flex items-center gap-4 text-sm">
          <span className="text-dim">
            <span className="font-bold text-neon">{kcal ?? "…"}</span>
            {calorieTarget ? <span className="text-muted"> / {Math.round(calorieTarget)} kcal</span> : <span className="text-muted"> kcal</span>}
          </span>
          <span className="text-dim flex items-center gap-1"><Droplet className="w-3.5 h-3.5 text-sky-400" />{waterMl} ml</span>
        </div>
        {calorieTarget ? (
          <div className="h-1.5 rounded-full bg-subtle overflow-hidden mt-2">
            <div className="h-full bg-neon transition-all" style={{ width: `${pct}%` }} />
          </div>
        ) : null}
      </div>
    </Link>
  );
}
