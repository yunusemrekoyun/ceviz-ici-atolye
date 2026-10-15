"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Loader2, Save, Plus, X } from "lucide-react";

type Plan = {
  id?: string;
  name?: string;
  description?: string | null;
  price?: any;
  interval?: string;
  durationDays?: number;
  features?: string[];
  isPopular?: boolean;
  isActive?: boolean;
  order?: number;
};

export function PlanDialog({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Plan }) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [f, setF] = useState<Plan>({});
  const [feature, setFeature] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setF({
        name: initial?.name || "",
        description: initial?.description || "",
        price: initial?.price ? Number(initial.price) : 0,
        interval: initial?.interval || "MONTHLY",
        durationDays: initial?.durationDays || 30,
        features: initial?.features || [],
        isPopular: !!initial?.isPopular,
        isActive: initial?.isActive !== false,
        order: initial?.order ?? 0,
      });
      setFeature("");
      setErr(null);
    }
  }, [open, initial]);

  const submit = async () => {
    setLoading(true); setErr(null);
    const url = isEdit ? `/api/plans/${initial!.id}` : "/api/plans";
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setErr(data.error || "Hata");
    onClose();
    router.refresh();
  };

  return (
    <Modal
      open={open} onClose={onClose} size="lg"
      title={isEdit ? "Plan Düzenle" : "Yeni Plan"}
      footer={<>
        <button onClick={onClose} className="btn-ghost btn-md">Vazgeç</button>
        <button onClick={submit} disabled={loading} className="btn-primary btn-md">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" />Kaydet</>}
        </button>
      </>}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label-base">Plan Adı *</label>
          <input className="input-base" value={f.name || ""} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div className="col-span-2">
          <label className="label-base">Açıklama</label>
          <textarea rows={2} className="input-base" value={f.description || ""} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        <div>
          <label className="label-base">Fiyat (₺) *</label>
          <input type="number" className="input-base" value={f.price || ""} onChange={(e) => setF({ ...f, price: e.target.value })} />
        </div>
        <div>
          <label className="label-base">Süre (gün) *</label>
          <input type="number" className="input-base" value={f.durationDays || ""} onChange={(e) => setF({ ...f, durationDays: +e.target.value })} />
        </div>
        <div>
          <label className="label-base">Dönem</label>
          <select className="input-base" value={f.interval} onChange={(e) => setF({ ...f, interval: e.target.value })}>
            <option value="MONTHLY">Aylık</option>
            <option value="QUARTERLY">3 Aylık</option>
            <option value="YEARLY">Yıllık</option>
            <option value="ONE_TIME">Tek Seferlik</option>
          </select>
        </div>
        <div>
          <label className="label-base">Sıralama</label>
          <input type="number" className="input-base" value={f.order ?? 0} onChange={(e) => setF({ ...f, order: +e.target.value })} />
        </div>

        <div className="col-span-2">
          <label className="label-base">Özellikler</label>
          <div className="flex gap-2">
            <input className="input-base" value={feature} onChange={(e) => setFeature(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (feature.trim()) { setF({ ...f, features: [...(f.features || []), feature.trim()] }); setFeature(""); } } }}
              placeholder="Özellik ekle ve Enter'a bas" />
            <button type="button" className="btn-secondary btn-md" onClick={() => { if (feature.trim()) { setF({ ...f, features: [...(f.features || []), feature.trim()] }); setFeature(""); } }}>
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(f.features || []).map((ft, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-subtle text-xs">
                {ft}
                <button onClick={() => setF({ ...f, features: f.features!.filter((_, idx) => idx !== i) })}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="col-span-2 flex gap-6 pt-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!f.isPopular} onChange={(e) => setF({ ...f, isPopular: e.target.checked })} className="accent-neon" />
            Popüler olarak işaretle
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={f.isActive !== false} onChange={(e) => setF({ ...f, isActive: e.target.checked })} className="accent-neon" />
            Aktif (sitede göster)
          </label>
        </div>

        {err && <div className="col-span-2 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{err}</div>}
      </div>
    </Modal>
  );
}
