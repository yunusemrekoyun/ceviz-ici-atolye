"use client";

import { useState } from "react";
import { Plus, X, Ticket, CheckCircle, XCircle, Trash2, Percent, Banknote } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { api } from "@/lib/api";

type CouponType = "PERCENT" | "FIXED";
interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: string | number;
  minAmount: string | number | null;
  maxUses: number | null;
  usedCount: number;
  validFrom: string | null;
  validUntil: string | null;
  planId: string | null;
  isActive: boolean;
}
type PlanOption = { id: string; name: string };

interface FormState {
  code: string; type: CouponType; value: string; minAmount: string;
  maxUses: string; validFrom: string; validUntil: string; planId: string;
}
const EMPTY: FormState = { code: "", type: "PERCENT", value: "", minAmount: "", maxUses: "", validFrom: "", validUntil: "", planId: "" };

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) : null;
}

export function KuponlarClient({ initialCoupons, plans }: { initialCoupons: Coupon[]; plans: PlanOption[] }) {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post<Coupon>("/api/coupons", {
        code: form.code,
        type: form.type,
        value: Number(form.value),
        minAmount: form.minAmount ? Number(form.minAmount) : null,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
        validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
        planId: form.planId || null,
      });
      const all = await api.get<Coupon[]>("/api/coupons");
      setCoupons(all);
      toast({ type: "success", message: "Kupon oluşturuldu." });
      setModal(false);
      setForm(EMPTY);
    } catch (e: any) {
      toast({ type: "error", message: e.message || "Oluşturulamadı." });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: Coupon) {
    setBusyId(c.id);
    try {
      const updated = await api.patch<Coupon>(`/api/coupons/${c.id}`, { isActive: !c.isActive });
      setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, isActive: updated.isActive } : x)));
    } catch (e: any) {
      toast({ type: "error", message: e.message || "Güncellenemedi." });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(c: Coupon) {
    if (!confirm(`"${c.code}" kuponu silinsin mi?`)) return;
    setBusyId(c.id);
    try {
      const res = await api.del<{ soft?: boolean }>(`/api/coupons/${c.id}`);
      if (res?.soft) {
        setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, isActive: false } : x)));
        toast({ type: "success", message: "Kupon kullanılmış; pasife alındı." });
      } else {
        setCoupons((prev) => prev.filter((x) => x.id !== c.id));
        toast({ type: "success", message: "Kupon silindi." });
      }
    } catch (e: any) {
      toast({ type: "error", message: e.message || "Silinemedi." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kuponlar</h1>
          <p className="text-sm text-label mt-1">{coupons.length} indirim kuponu</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary btn-md"><Plus className="w-4 h-4" /> Yeni Kupon</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.length === 0 && (
          <div className="card-surface p-10 text-center text-muted col-span-full">
            <Ticket className="w-8 h-8 mx-auto mb-2 opacity-40" />Henüz kupon yok
          </div>
        )}
        {coupons.map((c) => {
          const planName = c.planId ? plans.find((p) => p.id === c.planId)?.name : null;
          const exhausted = c.maxUses != null && c.usedCount >= c.maxUses;
          return (
            <div key={c.id} className={`card-surface p-5 flex flex-col gap-3 ${!c.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neon/10 grid place-items-center shrink-0">
                  {c.type === "PERCENT" ? <Percent className="w-5 h-5 text-neon" /> : <Banknote className="w-5 h-5 text-neon" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono font-bold tracking-wider">{c.code}</div>
                  <div className="text-sm text-neon">
                    {c.type === "PERCENT" ? `%${Number(c.value)} indirim` : `${Number(c.value)} ₺ indirim`}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                  {c.isActive ? "Aktif" : "Pasif"}
                </span>
              </div>

              <div className="text-xs text-dim space-y-1">
                <div className="flex justify-between"><span className="text-label">Kullanım</span><span className={exhausted ? "text-amber-400" : ""}>{c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : " (sınırsız)"}</span></div>
                {c.minAmount != null && <div className="flex justify-between"><span className="text-label">Min. tutar</span><span>{Number(c.minAmount)} ₺</span></div>}
                {planName && <div className="flex justify-between"><span className="text-label">Plan</span><span>{planName}</span></div>}
                {fmtDate(c.validUntil) && <div className="flex justify-between"><span className="text-label">Son geçerlilik</span><span>{fmtDate(c.validUntil)}</span></div>}
              </div>

              <div className="flex items-center gap-1.5 pt-1 border-t border-subtle">
                <button onClick={() => toggleActive(c)} disabled={busyId === c.id} className="flex-1 btn-secondary btn-sm gap-1.5">
                  {c.isActive ? <><XCircle className="w-3.5 h-3.5" /> Pasife al</> : <><CheckCircle className="w-3.5 h-3.5" /> Aktifleştir</>}
                </button>
                <button onClick={() => remove(c)} disabled={busyId === c.id} className="p-2 rounded-xl hover:bg-rose-500/10 text-muted hover:text-rose-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModal(false)} />
          <div className="relative w-full max-w-lg card-surface rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Yeni Kupon</h2>
              <button onClick={() => setModal(false)} className="p-1 rounded-lg hover:bg-subtle text-label"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-body mb-1.5">Kod *</label>
                  <input className="input w-full font-mono uppercase" placeholder="YAZ2026" value={form.code} onChange={field("code")} required minLength={3} />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Tür *</label>
                  <select className="input w-full" value={form.type} onChange={field("type")}>
                    <option value="PERCENT">Yüzde (%)</option>
                    <option value="FIXED">Sabit tutar (₺)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-body mb-1.5">Değer * {form.type === "PERCENT" ? "(%)" : "(₺)"}</label>
                  <input className="input w-full" type="number" step="0.01" min={0} value={form.value} onChange={field("value")} required />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Min. sepet tutarı (₺)</label>
                  <input className="input w-full" type="number" step="0.01" min={0} placeholder="opsiyonel" value={form.minAmount} onChange={field("minAmount")} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-body mb-1.5">Maks. kullanım</label>
                  <input className="input w-full" type="number" min={1} placeholder="sınırsız" value={form.maxUses} onChange={field("maxUses")} />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Yalnızca plan</label>
                  <select className="input w-full" value={form.planId} onChange={field("planId")}>
                    <option value="">Tüm planlar</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-body mb-1.5">Başlangıç</label>
                  <input className="input w-full" type="datetime-local" value={form.validFrom} onChange={field("validFrom")} />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Bitiş</label>
                  <input className="input w-full" type="datetime-local" value={form.validUntil} onChange={field("validUntil")} />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary btn-md flex-1">İptal</button>
                <button type="submit" disabled={saving} className="btn-primary btn-md flex-1">
                  {saving ? "Oluşturuluyor…" : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
