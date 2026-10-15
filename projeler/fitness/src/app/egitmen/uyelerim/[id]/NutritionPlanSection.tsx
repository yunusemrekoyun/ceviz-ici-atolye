"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Apple, Plus, X, Search, Loader2, Trash2, Target } from "lucide-react";
import { macrosFor, MEAL_TYPES, MEAL_LABEL, sumMacros, type MealTypeKey } from "@/lib/nutrition";

interface Food { id: string; name: string; category: string | null; kcal: number; protein: number; carbs: number; fat: number; defaultServingG: number | null }

interface PlanItem { id: string; customName: string | null; grams: number; food: Food | null }
interface PlanMeal { type: MealTypeKey; label: string | null; items: PlanItem[] }
interface Plan {
  id: string; title: string; description: string | null;
  calorieTarget: number | null; proteinTarget: number | null; carbTarget: number | null; fatTarget: number | null; waterTargetMl: number | null;
  meals: PlanMeal[];
}

interface BuilderItem { key: string; foodId: string | null; name: string; per100: { kcal: number; protein: number; carbs: number; fat: number } | null; grams: number }
type BuilderMeals = Record<MealTypeKey, BuilderItem[]>;

const emptyMeals = (): BuilderMeals => ({ BREAKFAST: [], LUNCH: [], DINNER: [], SNACK: [] });
let keySeq = 0;

function itemMacros(it: BuilderItem) {
  return it.per100 ? macrosFor(it.per100, it.grams) : { kcal: 0, protein: 0, carbs: 0, fat: 0 };
}

export function NutritionPlanSection({ memberId, initialPlan }: { memberId: string; initialPlan: Plan | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="card-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold flex items-center gap-2"><Apple className="w-4 h-4 text-neon" /> Beslenme Planı</h2>
        <button onClick={() => setOpen(true)} className="btn-secondary btn-sm"><Plus className="w-3.5 h-3.5" /> {initialPlan ? "Yeni Plan" : "Plan Oluştur"}</button>
      </div>

      {!initialPlan ? (
        <div className="text-center py-8 text-muted text-sm">Henüz beslenme planı oluşturulmamış.</div>
      ) : (
        <ActivePlanView plan={initialPlan} />
      )}

      {open && (
        <BuilderModal
          memberId={memberId}
          onClose={() => setOpen(false)}
          onSaved={() => { setOpen(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function ActivePlanView({ plan }: { plan: Plan }) {
  const targets = [
    ["Kalori", plan.calorieTarget, "kcal"],
    ["Protein", plan.proteinTarget, "g"],
    ["Karb.", plan.carbTarget, "g"],
    ["Yağ", plan.fatTarget, "g"],
    ["Su", plan.waterTargetMl, "ml"],
  ] as const;
  return (
    <div className="space-y-4">
      <div className="font-medium">{plan.title}</div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {targets.map(([label, val, unit]) => (
          <div key={label} className="rounded-lg bg-subtle p-2 text-center">
            <div className="text-sm font-bold text-neon">{val != null ? Math.round(val) : "—"}</div>
            <div className="text-[10px] text-label">{label}{val != null ? ` (${unit})` : ""}</div>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {plan.meals.filter((m) => m.items.length > 0).map((m) => (
          <div key={m.type} className="rounded-xl bg-subtle border border-subtle p-3">
            <div className="text-xs font-semibold text-dim mb-1.5">{m.label || MEAL_LABEL[m.type]}</div>
            <div className="space-y-1">
              {m.items.map((it) => (
                <div key={it.id} className="flex justify-between text-xs">
                  <span>{it.food?.name ?? it.customName} <span className="text-faint">· {Math.round(it.grams)}g</span></span>
                  {it.food && <span className="text-muted">{Math.round(it.food.kcal * it.grams / 100)} kcal</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BuilderModal({ memberId, onClose, onSaved }: { memberId: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("Beslenme Planı");
  const [meals, setMeals] = useState<BuilderMeals>(emptyMeals);
  const [targets, setTargets] = useState({ kcal: "", protein: "", carbs: "", fat: "", water: "2500" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const dailyTotal = sumMacros(MEAL_TYPES.flatMap((t) => meals[t].map(itemMacros)));

  function addItem(type: MealTypeKey, item: BuilderItem) {
    setMeals((m) => ({ ...m, [type]: [...m[type], item] }));
  }
  function removeItem(type: MealTypeKey, key: string) {
    setMeals((m) => ({ ...m, [type]: m[type].filter((i) => i.key !== key) }));
  }
  function setGrams(type: MealTypeKey, key: string, grams: number) {
    setMeals((m) => ({ ...m, [type]: m[type].map((i) => (i.key === key ? { ...i, grams } : i)) }));
  }

  function fillTargetsFromTotal() {
    setTargets((t) => ({ ...t, kcal: String(dailyTotal.kcal), protein: String(dailyTotal.protein), carbs: String(dailyTotal.carbs), fat: String(dailyTotal.fat) }));
  }

  async function save() {
    setSaving(true); setError("");
    const mealsPayload = MEAL_TYPES
      .filter((t) => meals[t].length > 0)
      .map((t, order) => ({
        type: t,
        order,
        items: meals[t].map((it, i) => ({
          foodId: it.foodId,
          customName: it.foodId ? null : it.name,
          grams: it.grams,
          order: i,
        })),
      }));
    try {
      const res = await fetch("/api/nutrition-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          title,
          startDate: new Date().toISOString(),
          calorieTarget: targets.kcal ? Number(targets.kcal) : null,
          proteinTarget: targets.protein ? Number(targets.protein) : null,
          carbTarget: targets.carbs ? Number(targets.carbs) : null,
          fatTarget: targets.fat ? Number(targets.fat) : null,
          waterTargetMl: targets.water ? Number(targets.water) : null,
          meals: mealsPayload,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Kaydedilemedi"); return; }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl card-surface rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Yeni Beslenme Planı</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-subtle text-label"><X className="w-5 h-5" /></button>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-body mb-1.5">Plan Adı</label>
          <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-3">
          {MEAL_TYPES.map((t) => {
            const total = sumMacros(meals[t].map(itemMacros));
            return (
              <div key={t} className="rounded-xl border border-subtle p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{MEAL_LABEL[t]}</span>
                  {meals[t].length > 0 && <span className="text-xs text-muted">{total.kcal} kcal · P{total.protein} K{total.carbs} Y{total.fat}</span>}
                </div>
                <div className="space-y-1.5 mb-2">
                  {meals[t].map((it) => {
                    const mm = itemMacros(it);
                    return (
                      <div key={it.key} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 truncate">{it.name}</span>
                        <input
                          type="number" min={1} value={it.grams}
                          onChange={(e) => setGrams(t, it.key, Math.max(1, Number(e.target.value) || 1))}
                          className="input-base w-20 text-right py-1"
                        />
                        <span className="text-xs text-faint w-8">g</span>
                        <span className="text-xs text-muted w-16 text-right">{mm.kcal} kcal</span>
                        <button onClick={() => removeItem(t, it.key)} className="p-1 text-muted hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    );
                  })}
                </div>
                <FoodPicker onPick={(item) => addItem(t, item)} />
              </div>
            );
          })}
        </div>

        {/* Hedefler */}
        <div className="mt-5 rounded-xl border border-neon/20 bg-neon/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold flex items-center gap-1.5"><Target className="w-4 h-4 text-neon" /> Günlük Hedefler</span>
            <button onClick={fillTargetsFromTotal} className="text-xs text-neon hover:underline">Toplamdan doldur ({dailyTotal.kcal} kcal)</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {([["kcal", "Kalori"], ["protein", "Protein"], ["carbs", "Karb."], ["fat", "Yağ"], ["water", "Su (ml)"]] as const).map(([k, label]) => (
              <div key={k}>
                <label className="block text-[10px] text-label mb-1">{label}</label>
                <input type="number" min={0} value={targets[k]} onChange={(e) => setTargets((tt) => ({ ...tt, [k]: e.target.value }))} className="input-base w-full py-1.5 text-sm" />
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-rose-400 mt-3">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-secondary btn-md flex-1">İptal</button>
          <button onClick={save} disabled={saving} className="btn-primary btn-md flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Planı Kaydet"}</button>
        </div>
      </div>
    </div>
  );
}

function FoodPicker({ onPick }: { onPick: (item: BuilderItem) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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

  function pickFood(f: Food) {
    onPick({ key: `k${++keySeq}`, foodId: f.id, name: f.name, per100: { kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat }, grams: f.defaultServingG ?? 100 });
    setQ(""); setResults([]); setOpen(false);
  }
  function addCustom() {
    const name = q.trim();
    if (!name) return;
    onPick({ key: `k${++keySeq}`, foodId: null, name, per100: null, grams: 100 });
    setQ(""); setResults([]); setOpen(false);
  }

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (results[0]) pickFood(results[0]); else addCustom(); } }}
          placeholder="Besin ara veya yaz…"
          className="input-base pl-8 py-1.5 text-sm w-full"
        />
        {loading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-faint" />}
      </div>
      {open && (results.length > 0 || q.trim()) && (
        <div className="absolute z-20 left-0 right-0 mt-1 card-surface rounded-xl border border-subtle-md shadow-xl max-h-56 overflow-y-auto">
          {results.map((f) => (
            <button key={f.id} onClick={() => pickFood(f)} className="w-full text-left px-3 py-2 text-sm hover:bg-subtle flex justify-between">
              <span>{f.name}<span className="text-faint text-xs ml-1">{f.category}</span></span>
              <span className="text-xs text-muted">{Math.round(f.kcal)} kcal/100g</span>
            </button>
          ))}
          {q.trim() && (
            <button onClick={addCustom} className="w-full text-left px-3 py-2 text-sm text-neon hover:bg-subtle border-t border-subtle">
              + "{q.trim()}" özel olarak ekle
            </button>
          )}
        </div>
      )}
    </div>
  );
}
