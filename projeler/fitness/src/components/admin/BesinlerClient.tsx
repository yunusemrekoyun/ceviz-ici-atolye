"use client";

import { useMemo, useState } from "react";
import { Plus, X, Search, Pencil, Trash2, Apple } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";

interface Food {
  id: string;
  name: string;
  category: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  defaultServingG: number | null;
  isPublic: boolean;
}

interface FormState {
  name: string; category: string; kcal: string; protein: string; carbs: string; fat: string; defaultServingG: string;
}
const EMPTY: FormState = { name: "", category: "", kcal: "", protein: "", carbs: "", fat: "", defaultServingG: "" };

function toForm(f: Food): FormState {
  return {
    name: f.name, category: f.category ?? "", kcal: String(f.kcal), protein: String(f.protein),
    carbs: String(f.carbs), fat: String(f.fat), defaultServingG: f.defaultServingG != null ? String(f.defaultServingG) : "",
  };
}

export function BesinlerClient({ initialFoods }: { initialFoods: Food[] }) {
  const { toast } = useToast();
  const [foods, setFoods] = useState<Food[]>(initialFoods);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Food | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? foods.filter((f) => f.name.toLowerCase().includes(s) || (f.category ?? "").toLowerCase().includes(s)) : foods;
  }, [foods, q]);

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }
  function openCreate() { setEditing(null); setForm(EMPTY); setModal("create"); }
  function openEdit(f: Food) { setEditing(f); setForm(toForm(f)); setModal("edit"); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      category: form.category || null,
      kcal: Number(form.kcal) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
      defaultServingG: form.defaultServingG ? Number(form.defaultServingG) : null,
    };
    try {
      if (editing) {
        const updated = await api.patch<Food>(`/api/foods/${editing.id}`, payload);
        setFoods((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        toast({ type: "success", message: "Besin güncellendi." });
      } else {
        const created = await api.post<Food>("/api/foods", { ...payload, isPublic: true });
        setFoods((prev) => [...prev, created].sort((a, b) => (a.category ?? "").localeCompare(b.category ?? "", "tr") || a.name.localeCompare(b.name, "tr")));
        toast({ type: "success", message: "Besin eklendi." });
      }
      setModal(null);
    } catch (e: any) {
      toast({ type: "error", message: e.message || "Kaydedilemedi." });
    } finally {
      setSaving(false);
    }
  }

  async function remove(f: Food) {
    if (!confirm(`"${f.name}" silinsin mi?`)) return;
    try {
      await api.del(`/api/foods/${f.id}`);
      setFoods((prev) => prev.filter((x) => x.id !== f.id));
      toast({ type: "success", message: "Besin silindi." });
    } catch (e: any) {
      toast({ type: "error", message: e.message || "Silinemedi." });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Besin Kütüphanesi</h1>
          <p className="text-sm text-label mt-1">{foods.length} besin · 100g başına değerler</p>
        </div>
        <button onClick={openCreate} className="btn-primary btn-md"><Plus className="w-4 h-4" /> Yeni Besin</button>
      </div>

      <div className="card-surface p-3 mb-4 relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Besin veya kategori ara…" className="input-base pl-9" />
      </div>

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-label border-b border-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Besin</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium text-right">Kalori</th>
                <th className="px-4 py-3 font-medium text-right">P</th>
                <th className="px-4 py-3 font-medium text-right">K</th>
                <th className="px-4 py-3 font-medium text-right">Y</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted"><Apple className="w-8 h-8 mx-auto mb-2 opacity-40" />Besin bulunamadı</td></tr>
              )}
              {filtered.map((f) => (
                <tr key={f.id} className="border-b border-subtle/60 last:border-0">
                  <td className="px-4 py-2.5 font-medium">
                    {f.name}
                    {!f.isPublic && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-subtle text-label">özel</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{f.category ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-neon">{Math.round(f.kcal)}</td>
                  <td className="px-4 py-2.5 text-right text-dim">{f.protein}</td>
                  <td className="px-4 py-2.5 text-right text-dim">{f.carbs}</td>
                  <td className="px-4 py-2.5 text-right text-dim">{f.fat}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg hover:bg-subtle text-muted"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => remove(f)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative w-full max-w-md card-surface rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">{editing ? "Besini Düzenle" : "Yeni Besin"}</h2>
              <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-subtle text-label"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-body mb-1.5">Ad *</label>
                  <input className="input w-full" value={form.name} onChange={field("name")} required minLength={2} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-body mb-1.5">Kategori</label>
                  <input className="input w-full" value={form.category} onChange={field("category")} placeholder="örn. Meyve" />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Kalori (kcal) *</label>
                  <input className="input w-full" type="number" step="0.1" min={0} value={form.kcal} onChange={field("kcal")} required />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Porsiyon (g)</label>
                  <input className="input w-full" type="number" step="1" min={0} value={form.defaultServingG} onChange={field("defaultServingG")} placeholder="ops." />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Protein (g)</label>
                  <input className="input w-full" type="number" step="0.1" min={0} value={form.protein} onChange={field("protein")} />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Karbonhidrat (g)</label>
                  <input className="input w-full" type="number" step="0.1" min={0} value={form.carbs} onChange={field("carbs")} />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Yağ (g)</label>
                  <input className="input w-full" type="number" step="0.1" min={0} value={form.fat} onChange={field("fat")} />
                </div>
              </div>
              <p className="text-xs text-muted">Değerler 100 gram içindir.</p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(null)} className="btn-secondary btn-md flex-1">İptal</button>
                <button type="submit" disabled={saving} className="btn-primary btn-md flex-1">{saving ? "Kaydediliyor…" : editing ? "Güncelle" : "Ekle"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
