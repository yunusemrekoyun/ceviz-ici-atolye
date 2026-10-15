"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import {
  TrendingDown, TrendingUp, Minus, Plus, Trash2,
  Upload, X, Camera, ChevronDown, ChevronUp,
  Trophy, Activity, CalendarDays,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { useUpload } from "@/hooks/useUpload";

const IlerlemeLineChart = dynamic(() => import("./IlerlemeLineChart"), {
  ssr: false,
  loading: () => <div className="h-[240px] animate-pulse rounded-xl bg-subtle" />,
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
  armCm: number | null;
  legCm: number | null;
  notes: string | null;
}

interface ProgressPhoto {
  id: string;
  imageUrl: string;
  label: string | null;
  takenAt: string;
}

type MetricKey = keyof Omit<Measurement, "id" | "recordedAt" | "notes">;

const METRICS: { key: MetricKey; label: string; unit: string; color: string; lowerIsBetter?: boolean }[] = [
  { key: "weightKg",   label: "Kilo",    unit: "kg", color: "#C6FF3D", lowerIsBetter: true },
  { key: "bodyFatPct", label: "Yağ %",   unit: "%",  color: "#f97316", lowerIsBetter: true },
  { key: "musclePct",  label: "Kas %",   unit: "%",  color: "#22d3ee" },
  { key: "waistCm",    label: "Bel",     unit: "cm", color: "#a78bfa", lowerIsBetter: true },
  { key: "chestCm",    label: "Göğüs",   unit: "cm", color: "#f472b6" },
  { key: "hipCm",      label: "Kalça",   unit: "cm", color: "#fb923c" },
  { key: "armCm",      label: "Kol",     unit: "cm", color: "#34d399" },
  { key: "legCm",      label: "Bacak",   unit: "cm", color: "#60a5fa" },
];

const EMPTY_FORM = {
  weightKg: "", bodyFatPct: "", musclePct: "",
  waistCm: "", chestCm: "", hipCm: "", armCm: "", legCm: "",
  notes: "", recordedAt: new Date().toISOString().slice(0, 10),
};

interface Props {
  initialMeasurements: Measurement[];
  initialPhotos: ProgressPhoto[];
}

export function IlerlemeClient({ initialMeasurements, initialPhotos }: Props) {
  const { toast } = useToast();
  const [measurements, setMeasurements] = useState<Measurement[]>(initialMeasurements);
  const [photos, setPhotos] = useState<ProgressPhoto[]>(initialPhotos);
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(["weightKg"]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const { upload: uploadPhoto, uploading: photoUploading } = useUpload("progress");
  const [lightbox, setLightbox] = useState<ProgressPhoto | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function toggleMetric(key: MetricKey) {
    setActiveMetrics((prev) => {
      if (prev.includes(key)) {
        return prev.length > 1 ? prev.filter((k) => k !== key) : prev;
      }
      return [...prev, key];
    });
  }

  async function handleAddMeasurement(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, string | number | null> = { recordedAt: form.recordedAt, notes: form.notes || null };
    for (const m of METRICS) {
      const v = (form as any)[m.key];
      payload[m.key] = v !== "" ? Number(v) : null;
    }
    const res = await fetch("/api/panel/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (!res.ok) { toast({ type: "error", message: "Ölçüm kaydedilemedi" }); return; }
    const { measurement } = await res.json();
    setMeasurements((prev) => [...prev, measurement].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()));
    setForm(EMPTY_FORM);
    setShowForm(false);
    toast({ type: "success", message: "Ölçüm eklendi" });
  }

  async function handleDeleteMeasurement(id: string) {
    if (!confirm("Bu ölçümü silmek istediğine emin misin?")) return;
    await fetch(`/api/measurements/${id}`, { method: "DELETE" });
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
    toast({ type: "success", message: "Ölçüm silindi" });
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const imageUrl = await uploadPhoto(file);
    if (!imageUrl) { toast({ type: "error", message: "Fotoğraf yüklenemedi" }); return; }
    const res = await fetch("/api/panel/progress/photos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl }),
    });
    if (!res.ok) { toast({ type: "error", message: "Fotoğraf kaydedilemedi" }); return; }
    const { photo } = await res.json();
    setPhotos((prev) => [photo, ...prev]);
    toast({ type: "success", message: "Fotoğraf yüklendi" });
    e.target.value = "";
  }

  async function handleDeletePhoto(id: string) {
    if (!confirm("Bu fotoğrafı silmek istediğine emin misin?")) return;
    await fetch(`/api/panel/progress/photos/${id}`, { method: "DELETE" });
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  // --- Özet istatistikler ---
  const trackingDays = measurements.length >= 2
    ? Math.round((new Date(measurements.at(-1)!.recordedAt).getTime() - new Date(measurements[0].recordedAt).getTime()) / 86400000)
    : 0;

  const bestMetric = (() => {
    let best: { label: string; pct: number; positive: boolean } | null = null;
    for (const m of METRICS) {
      const first = measurements.find((me) => me[m.key] != null);
      const last = [...measurements].reverse().find((me) => me[m.key] != null);
      if (!first || !last || first === last) continue;
      const delta = (Number(last[m.key]) - Number(first[m.key])) / Math.abs(Number(first[m.key])) * 100;
      const isImprovement = m.lowerIsBetter ? delta < 0 : delta > 0;
      const absDelta = Math.abs(delta);
      if (!best || absDelta > best.pct) {
        best = { label: m.label, pct: +absDelta.toFixed(1), positive: isImprovement };
      }
    }
    return best;
  })();

  // empty state
  if (measurements.length === 0) {
    return (
      <div className="space-y-6">
        <div className="card-surface rounded-3xl overflow-hidden">
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-neon/10 grid place-items-center mx-auto mb-4">
              <Activity className="w-8 h-8 text-neon" />
            </div>
            <div className="text-xl font-bold">İlerleme takibine başla</div>
            <p className="text-sm text-body mt-2 max-w-xs mx-auto">
              İlk ölçümünü ekle — her girişin seni hedefe bir adım daha yaklaştırır.
            </p>
            <button onClick={() => setShowForm(true)} className="mt-5 btn-primary btn-md">
              <Plus className="w-4 h-4" /> İlk Ölçümü Ekle
            </button>
          </div>
        </div>
        {showForm && <MeasurementForm form={form} setForm={setForm} onSubmit={handleAddMeasurement} onClose={() => setShowForm(false)} saving={saving} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── İki sütun: sol = metrikler, sağ = grafik + form ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">

        {/* Sol: özet + metrik kartları */}
        <div className="lg:col-span-2 space-y-3">

          {/* Özet istatistikler */}
          {measurements.length >= 2 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="card-surface p-3 text-center rounded-2xl">
                <CalendarDays className="w-4 h-4 text-neon mx-auto mb-1" />
                <div className="text-xl font-bold">{trackingDays}</div>
                <div className="text-[10px] text-muted">gün takip</div>
              </div>
              <div className="card-surface p-3 text-center rounded-2xl">
                <Activity className="w-4 h-4 text-neon mx-auto mb-1" />
                <div className="text-xl font-bold">{measurements.length}</div>
                <div className="text-[10px] text-muted">ölçüm</div>
              </div>
              <div className="card-surface p-3 text-center rounded-2xl">
                <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                {bestMetric ? (
                  <>
                    <div className={`text-xl font-bold ${bestMetric.positive ? "text-emerald-400" : "text-amber-400"}`}>
                      %{bestMetric.pct}
                    </div>
                    <div className="text-[10px] text-muted">{bestMetric.label}</div>
                  </>
                ) : (
                  <div className="text-[10px] text-faint mt-2">—</div>
                )}
              </div>
            </div>
          )}

          {/* Metrik kartları — 2 sütun */}
          <div className="grid grid-cols-2 gap-2">
            {METRICS.map((m) => {
              const latest   = [...measurements].reverse().find((me) => me[m.key] != null);
              const earliest = measurements.find((me) => me[m.key] != null);
              const delta    = latest && earliest && latest !== earliest
                ? +(Number(latest[m.key]) - Number(earliest[m.key])).toFixed(1) : null;
              const isGood   = delta !== null && (m.lowerIsBetter ? delta < 0 : delta > 0);
              const isActive = activeMetrics.includes(m.key);

              return (
                <button
                  key={m.key}
                  onClick={() => toggleMetric(m.key)}
                  className={`card-surface p-3.5 text-left transition-all rounded-2xl ${
                    isActive ? "ring-1" : "opacity-55 hover:opacity-90"
                  }`}
                  style={isActive ? { borderColor: m.color } as any : {}}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color }} />
                    <span className="text-[11px] text-label truncate">{m.label}</span>
                  </div>
                  <div className="text-lg font-bold leading-none">
                    {latest ? `${latest[m.key]}` : "—"}
                  </div>
                  <div className="text-[10px] text-faint mt-0.5">{m.unit}</div>
                  {delta !== null && (
                    <div className={`text-[10px] mt-1.5 flex items-center gap-0.5 font-medium ${
                      isGood ? "text-emerald-400" : delta === 0 ? "text-faint" : "text-amber-400"
                    }`}>
                      {delta < 0 ? <TrendingDown className="w-3 h-3" /> : delta > 0 ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      {delta > 0 ? "+" : ""}{delta}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sağ: grafik + ölçüm formu */}
        <div className="lg:col-span-3 space-y-4">

          {/* Grafik */}
          {measurements.length >= 2 ? (
            <div className="card-surface p-5 rounded-2xl">
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <div>
                  <div className="font-semibold text-sm">Gelişim Grafiği</div>
                  <div className="text-xs text-muted mt-0.5">Başlangıca göre % değişim</div>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="btn-secondary btn-sm">
                  <Plus className="w-3.5 h-3.5" />{showForm ? "Kapat" : "Ölçüm Ekle"}
                </button>
              </div>
              <div className="mt-3">
                <IlerlemeLineChart
                  measurements={measurements}
                  activeMetrics={activeMetrics}
                  metrics={METRICS}
                />
              </div>
            </div>
          ) : (
            <div className="card-surface p-8 text-center rounded-2xl">
              <Activity className="w-8 h-8 text-white/20 mx-auto mb-3" />
              <div className="text-sm text-faint">Grafik için en az 2 ölçüm gerekli</div>
              <button onClick={() => setShowForm(true)} className="mt-3 btn-secondary btn-sm">
                <Plus className="w-3.5 h-3.5" />Ölçüm Ekle
              </button>
            </div>
          )}

          {/* Ölçüm ekleme formu */}
          {showForm && (
            <MeasurementForm
              form={form} setForm={setForm}
              onSubmit={handleAddMeasurement}
              onClose={() => setShowForm(false)}
              saving={saving}
            />
          )}

          {/* Ölçüm geçmişi */}
          {measurements.length > 0 && (
            <div className="card-surface overflow-hidden rounded-2xl">
              <button
                onClick={() => setShowTable(!showTable)}
                className="w-full flex items-center justify-between p-4 hover:bg-subtle transition-colors"
              >
                <div className="text-sm font-semibold">
                  Ölçüm Geçmişi
                  <span className="text-xs text-muted font-normal ml-2">({measurements.length} kayıt)</span>
                </div>
                {showTable ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
              </button>
              {showTable && (
                <div className="overflow-x-auto border-t border-subtle">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-subtle bg-subtle">
                        <th className="text-left px-4 py-3 text-xs text-muted font-medium whitespace-nowrap">Tarih</th>
                        {METRICS.map((m) => (
                          <th key={m.key} className="text-right px-3 py-3 text-xs font-medium whitespace-nowrap" style={{ color: m.color }}>{m.label}</th>
                        ))}
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {[...measurements].reverse().map((m) => (
                        <tr key={m.id} className="border-b border-subtle last:border-0 hover:bg-subtle transition-colors">
                          <td className="px-4 py-3 text-dim whitespace-nowrap text-xs">
                            {new Date(m.recordedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          {METRICS.map((met) => (
                            <td key={met.key} className="px-3 py-3 text-right tabular-nums text-xs">
                              {m[met.key] != null
                                ? <span className="font-medium">{m[met.key]} <span className="text-faint font-normal">{met.unit}</span></span>
                                : <span className="text-white/15">—</span>}
                            </td>
                          ))}
                          <td className="px-3 py-3">
                            <button onClick={() => handleDeleteMeasurement(m.id)}
                              className="text-white/20 hover:text-rose-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fotoğraflar */}
      <div className="card-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-semibold text-sm">İlerleme Fotoğrafları</div>
            <div className="text-xs text-muted mt-0.5">Before/after karşılaştırması</div>
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={photoUploading} className="btn-secondary btn-sm">
            {photoUploading
              ? <><span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />Yükleniyor</>
              : <><Upload className="w-3.5 h-3.5" />Yükle</>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>

        {photos.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-subtle-md rounded-2xl">
            <Camera className="w-7 h-7 text-white/20 mx-auto mb-2" />
            <div className="text-sm text-faint">Henüz fotoğraf yok</div>
            <button onClick={() => fileRef.current?.click()} className="mt-2 text-xs text-neon hover:underline">
              İlk fotoğrafı yükle
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {photos.map((p) => (
              <div key={p.id} className="group relative rounded-xl overflow-hidden aspect-square bg-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageUrl} alt={p.label || "İlerleme fotoğrafı"}
                  className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                  onClick={() => setLightbox(p)} />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="text-xs text-white">
                    {new Date(p.takenAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                  </div>
                </div>
                <button onClick={() => handleDeletePhoto(p.id)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500/80">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)} className="absolute -top-10 right-0 text-body hover:text-white">
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.imageUrl} alt={lightbox.label || ""} className="w-full rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}

// --- Ölçüm Formu (ayrı bileşen) ---
const METRICS_LOCAL = [
  { key: "weightKg", label: "Kilo", unit: "kg" }, { key: "bodyFatPct", label: "Yağ %", unit: "%" },
  { key: "musclePct", label: "Kas %", unit: "%" }, { key: "waistCm", label: "Bel", unit: "cm" },
  { key: "chestCm", label: "Göğüs", unit: "cm" }, { key: "hipCm", label: "Kalça", unit: "cm" },
  { key: "armCm", label: "Kol", unit: "cm" }, { key: "legCm", label: "Bacak", unit: "cm" },
];

function MeasurementForm({ form, setForm, onSubmit, onClose, saving }: any) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold text-sm">Yeni Ölçüm Ekle</div>
        <button onClick={onClose} className="text-muted hover:text-white"><X className="w-4 h-4" /></button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-body mb-1.5">Tarih</label>
          <input type="date" value={form.recordedAt}
            onChange={(e) => setForm({ ...form, recordedAt: e.target.value })}
            className="input-base w-full md:w-48" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {METRICS_LOCAL.map((m) => (
            <div key={m.key}>
              <label className="text-xs text-body mb-1.5 block">{m.label} <span className="text-faint">({m.unit})</span></label>
              <input
                type="number" step="0.1" placeholder="—"
                value={(form as any)[m.key]}
                onChange={(e) => setForm({ ...form, [m.key]: e.target.value })}
                className="input-base w-full"
              />
            </div>
          ))}
        </div>
        <div>
          <label className="text-xs text-body mb-1.5 block">Not <span className="text-faint">(opsiyonel)</span></label>
          <input type="text" placeholder="örn. sabah aç karnına"
            value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="input-base w-full" />
        </div>
        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={saving} className="btn-primary btn-sm">
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary btn-sm">İptal</button>
        </div>
      </form>
    </div>
  );
}
