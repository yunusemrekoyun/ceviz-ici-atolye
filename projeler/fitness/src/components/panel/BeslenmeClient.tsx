"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search, Loader2, Trash2, Plus, Droplet, GlassWater } from "lucide-react";
import { MEAL_TYPES, MEAL_LABEL, sumMacros, type MealTypeKey } from "@/lib/nutrition";

interface Food { id: string; name: string; category: string | null; kcal: number; protein: number; carbs: number; fat: number; defaultServingG: number | null }
interface FoodLog { id: string; type: MealTypeKey; foodId: string | null; name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number }
interface PlanItem { customName: string | null; grams: number; food: Food | null }
interface PlanMeal { type: MealTypeKey; label: string | null; items: PlanItem[] }
interface Plan {
  waterTargetMl: number | null;
  calorieTarget: number | null; proteinTarget: number | null; carbTarget: number | null; fatTarget: number | null;
  meals: PlanMeal[];
}

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function shiftDate(s: string, days: number) {
  const d = new Date(s + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function humanDate(s: string) {
  const d = new Date(s + "T00:00:00Z");
  return d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

const GLASS_ML = 250;

export function BeslenmeClient({ plan }: { plan: Plan | null }) {
  const today = localToday();
  const [date, setDate] = useState(today);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [waterMl, setWaterMl] = useState(0);
  const [loading, setLoading] = useState(true);

  const waterTarget = plan?.waterTargetMl ?? 2500;
  const planByType = new Map<MealTypeKey, PlanMeal>((plan?.meals ?? []).map((m) => [m.type, m]));

  const load = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/panel/nutrition?date=${d}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
      setWaterMl(data.waterMl ?? 0);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  async function addLog(type: MealTypeKey, foodId: string | null, name: string, grams: number) {
    const res = await fetch("/api/panel/nutrition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, type, foodId, name, grams }),
    });
    const data = await res.json();
    if (res.ok) setLogs((prev) => [...prev, data.log]);
  }
  async function deleteLog(id: string) {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    await fetch(`/api/panel/nutrition?id=${id}`, { method: "DELETE" });
  }
  async function addWater(delta: number) {
    const res = await fetch("/api/panel/water", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, deltaMl: delta }),
    });
    const data = await res.json();
    if (res.ok) setWaterMl(data.waterMl);
  }

  const total = sumMacros(logs.map((l) => ({ kcal: l.kcal, protein: l.protein, carbs: l.carbs, fat: l.fat })));

  return (
    <div className="space-y-5">
      {/* Tarih gezinme */}
      <div className="flex items-center justify-between card-surface p-3">
        <button onClick={() => setDate(shiftDate(date, -1))} className="p-2 rounded-lg hover:bg-subtle"><ChevronLeft className="w-4 h-4" /></button>
        <div className="text-sm font-medium capitalize">{date === today ? "Bugün" : humanDate(date)}</div>
        <button onClick={() => setDate(shiftDate(date, 1))} disabled={date >= today} className="p-2 rounded-lg hover:bg-subtle disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
      </div>

      {/* Günlük özet — alım vs hedef */}
      <NutritionSummary total={total} plan={plan} />

      {/* Su takibi */}
      <div className="card-surface p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold flex items-center gap-1.5"><Droplet className="w-4 h-4 text-sky-400" /> Su</span>
          <span className="text-sm text-muted">{waterMl} / {waterTarget} ml</span>
        </div>
        <div className="h-2 rounded-full bg-subtle overflow-hidden mb-3">
          <div className="h-full bg-sky-400 transition-all" style={{ width: `${Math.min(100, (waterMl / waterTarget) * 100)}%` }} />
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: Math.min(8, Math.ceil(waterTarget / GLASS_ML)) }).map((_, i) => {
            const filled = waterMl >= (i + 1) * GLASS_ML;
            return <GlassWater key={i} className={`w-5 h-5 ${filled ? "text-sky-400" : "text-faint"}`} />;
          })}
          <div className="flex-1" />
          <button onClick={() => addWater(-GLASS_ML)} className="btn-secondary btn-sm">−</button>
          <button onClick={() => addWater(GLASS_ML)} className="btn-primary btn-sm"><Plus className="w-3.5 h-3.5" /> Bardak</button>
        </div>
      </div>

      {/* Öğünler */}
      {loading ? (
        <div className="card-surface p-8 text-center text-muted"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : (
        MEAL_TYPES.map((type) => (
          <MealCard
            key={type}
            type={type}
            logs={logs.filter((l) => l.type === type)}
            planMeal={planByType.get(type) ?? null}
            onAdd={(foodId, name, grams) => addLog(type, foodId, name, grams)}
            onDelete={deleteLog}
          />
        ))
      )}
    </div>
  );
}

function NutritionSummary({ total, plan }: { total: { kcal: number; protein: number; carbs: number; fat: number }; plan: Plan | null }) {
  const kcalTarget = plan?.calorieTarget ?? null;
  const r = 42;
  const circ = 2 * Math.PI * r;
  const kcalPct = kcalTarget ? Math.min(1, total.kcal / kcalTarget) : 0;
  const remaining = kcalTarget ? Math.round(kcalTarget - total.kcal) : null;

  const macros: { label: string; val: number; target: number | null; color: string }[] = [
    { label: "Protein", val: total.protein, target: plan?.proteinTarget ?? null, color: "bg-emerald-400" },
    { label: "Karb.", val: total.carbs, target: plan?.carbTarget ?? null, color: "bg-amber-400" },
    { label: "Yağ", val: total.fat, target: plan?.fatTarget ?? null, color: "bg-rose-400" },
  ];

  return (
    <div className="card-surface p-5 flex items-center gap-5 flex-wrap sm:flex-nowrap">
      <div className="relative w-28 h-28 shrink-0 mx-auto sm:mx-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-subtle" />
          {kcalTarget && (
            <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
              className="text-neon transition-all" strokeDasharray={circ} strokeDashoffset={circ * (1 - kcalPct)} />
          )}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-xl font-bold leading-none">{total.kcal}</div>
            <div className="text-[10px] text-label">{kcalTarget ? `/ ${Math.round(kcalTarget)} kcal` : "kcal"}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-[200px] space-y-3">
        {remaining != null && (
          <div className="text-sm">
            {remaining >= 0
              ? <span className="text-dim"><span className="font-semibold text-neon">{remaining}</span> kcal kaldı</span>
              : <span className="text-rose-400 font-medium">{Math.abs(remaining)} kcal hedefi aştın</span>}
          </div>
        )}
        {macros.map((m) => {
          const pct = m.target ? Math.min(100, (m.val / m.target) * 100) : 0;
          return (
            <div key={m.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-label">{m.label}</span>
                <span className="text-dim">{m.val}{m.target ? ` / ${Math.round(m.target)}` : ""} g</span>
              </div>
              <div className="h-1.5 rounded-full bg-subtle overflow-hidden">
                <div className={`h-full ${m.color} transition-all`} style={{ width: `${m.target ? pct : 0}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MealCard({ type, logs, planMeal, onAdd, onDelete }: {
  type: MealTypeKey;
  logs: FoodLog[];
  planMeal: PlanMeal | null;
  onAdd: (foodId: string | null, name: string, grams: number) => void;
  onDelete: (id: string) => void;
}) {
  const mealKcal = logs.reduce((s, l) => s + l.kcal, 0);
  return (
    <div className="card-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">{MEAL_LABEL[type]}</span>
        {logs.length > 0 && <span className="text-xs text-muted">{Math.round(mealKcal)} kcal</span>}
      </div>

      {planMeal && planMeal.items.length > 0 && (
        <div className="mb-3 text-xs text-muted bg-subtle/50 rounded-lg p-2">
          <span className="text-neon font-medium">Önerilen: </span>
          {planMeal.items.map((it, i) => (
            <span key={i}>{it.food?.name ?? it.customName} ({Math.round(it.grams)}g){i < planMeal.items.length - 1 ? ", " : ""}</span>
          ))}
        </div>
      )}

      <div className="space-y-1.5 mb-3">
        {logs.map((l) => (
          <div key={l.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 truncate">{l.name} <span className="text-faint">· {Math.round(l.grams)}g</span></span>
            <span className="text-xs text-muted">{Math.round(l.kcal)} kcal</span>
            <button onClick={() => onDelete(l.id)} className="p-1 text-muted hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        {logs.length === 0 && <div className="text-xs text-faint">Henüz kayıt yok.</div>}
      </div>

      <MemberFoodPicker onAdd={onAdd} />
    </div>
  );
}

function MemberFoodPicker({ onAdd }: { onAdd: (foodId: string | null, name: string, grams: number) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<{ foodId: string | null; name: string; grams: string } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/foods?q=${encodeURIComponent(q.trim())}&take=8`);
        const data = await res.json();
        setResults(data.foods ?? []);
        setOpen(true);
      } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(f: Food) {
    setPending({ foodId: f.id, name: f.name, grams: String(f.defaultServingG ?? 100) });
    setQ(""); setResults([]); setOpen(false);
  }
  function pickCustom() {
    const name = q.trim();
    if (!name) return;
    setPending({ foodId: null, name, grams: "100" });
    setQ(""); setResults([]); setOpen(false);
  }
  function confirm() {
    if (!pending) return;
    const g = Number(pending.grams);
    if (!g || g <= 0) return;
    onAdd(pending.foodId, pending.name, g);
    setPending(null);
  }

  if (pending) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm truncate">{pending.name}</span>
        <input type="number" min={1} value={pending.grams} onChange={(e) => setPending({ ...pending, grams: e.target.value })} className="input-base w-20 text-right py-1.5" autoFocus />
        <span className="text-xs text-faint">g</span>
        <button onClick={confirm} className="btn-primary btn-sm">Ekle</button>
        <button onClick={() => setPending(null)} className="btn-secondary btn-sm">İptal</button>
      </div>
    );
  }

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); results[0] ? pick(results[0]) : pickCustom(); } }}
          placeholder="Besin ara ve ekle…"
          className="input-base pl-8 py-1.5 text-sm w-full"
        />
        {loading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-faint" />}
      </div>
      {open && (results.length > 0 || q.trim()) && (
        <div className="absolute z-20 left-0 right-0 mt-1 card-surface rounded-xl border border-subtle-md shadow-xl max-h-56 overflow-y-auto">
          {results.map((f) => (
            <button key={f.id} onClick={() => pick(f)} className="w-full text-left px-3 py-2 text-sm hover:bg-subtle flex justify-between">
              <span>{f.name}<span className="text-faint text-xs ml-1">{f.category}</span></span>
              <span className="text-xs text-muted">{Math.round(f.kcal)} kcal/100g</span>
            </button>
          ))}
          {q.trim() && (
            <button onClick={pickCustom} className="w-full text-left px-3 py-2 text-sm text-neon hover:bg-subtle border-t border-subtle">
              + "{q.trim()}" özel ekle
            </button>
          )}
        </div>
      )}
    </div>
  );
}
