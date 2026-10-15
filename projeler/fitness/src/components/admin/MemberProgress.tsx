"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { Plus, Trash2, X, TrendingDown, TrendingUp, Minus, Upload, Camera } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { formatDate } from "@/lib/utils";
import { useUpload } from "@/hooks/useUpload";

const MemberProgressChart = dynamic(() => import("./MemberProgressChart"), {
  ssr: false,
  loading: () => <div className="h-[220px] animate-pulse rounded-xl bg-subtle" />,
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

interface Props {
  memberId: string;
  initialMeasurements: Measurement[];
}

type MetricKey = "weightKg" | "bodyFatPct" | "musclePct" | "waistCm";
const METRICS: { key: MetricKey; label: string; unit: string; color: string }[] = [
  { key: "weightKg",   label: "Kilo",      unit: "kg",  color: "#C6FF3D" },
  { key: "bodyFatPct", label: "Yağ %",     unit: "%",   color: "#f97316" },
  { key: "musclePct",  label: "Kas %",     unit: "%",   color: "#22d3ee" },
  { key: "waistCm",    label: "Bel",       unit: "cm",  color: "#a78bfa" },
];

const EMPTY_FORM = {
  recordedAt: new Date().toISOString().split("T")[0],
  weightKg: "", bodyFatPct: "", musclePct: "", waistCm: "",
  chestCm: "", hipCm: "", armCm: "", legCm: "", notes: "",
};

function delta(measurements: Measurement[], key: MetricKey) {
  const vals = measurements.map((m) => m[key]).filter((v) => v !== null) as number[];
  if (vals.length < 2) return null;
  return +(vals[vals.length - 1] - vals[0]).toFixed(1);
}

export function MemberProgress({ memberId, initialMeasurements }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"olcumler" | "fotograflar">("olcumler");
  const [measurements, setMeasurements] = useState<Measurement[]>(initialMeasurements);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [photosLoaded, setPhotosLoaded] = useState(false);
  const { upload: uploadPhoto, uploading: photoUploading } = useUpload("progress");
  const [lightbox, setLightbox] = useState<ProgressPhoto | null>(null);
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(["weightKg", "bodyFatPct"]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadPhotos() {
    if (photosLoaded) return;
    const res = await fetch(`/api/measurements/photos?memberId=${memberId}`);
    const json = await res.json();
    setPhotos(json.photos ?? []);
    setPhotosLoaded(true);
  }

  async function handleTabChange(t: "olcumler" | "fotograflar") {
    setTab(t);
    if (t === "fotograflar") loadPhotos();
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const imageUrl = await uploadPhoto(file);
    if (!imageUrl) { toast({ type: "error", message: "Fotoğraf yüklenemedi" }); return; }
    const res = await fetch("/api/measurements/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, imageUrl }),
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
    toast({ type: "success", message: "Fotoğraf silindi" });
  }

  function toggleMetric(key: MetricKey) {
    setActiveMetrics((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }

  const chartData = measurements.map((m) => ({
    date: new Date(m.recordedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
    weightKg: m.weightKg,
    bodyFatPct: m.bodyFatPct,
    musclePct: m.musclePct,
    waistCm: m.waistCm,
  }));

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, ...form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMeasurements((prev) =>
        [...prev, json.measurement].sort(
          (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
        )
      );
      toast({ type: "success", message: "Ölçüm eklendi." });
      setFormOpen(false);
      setForm(EMPTY_FORM);
    } catch (e: any) {
      toast({ type: "error", message: e.message || "Kaydedilemedi." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu ölçümü silmek istiyor musunuz?")) return;
    try {
      await fetch(`/api/measurements/${id}`, { method: "DELETE" });
      setMeasurements((prev) => prev.filter((m) => m.id !== id));
      toast({ type: "success", message: "Ölçüm silindi." });
    } catch {
      toast({ type: "error", message: "Silinemedi." });
    }
  }

  function field(key: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  const DeltaIcon = ({ v }: { v: number | null }) => {
    if (v === null) return <span className="text-faint">—</span>;
    if (v < 0) return <span className="text-emerald-400 flex items-center gap-1"><TrendingDown className="w-3 h-3" />{v}</span>;
    if (v > 0) return <span className="text-amber-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" />+{v}</span>;
    return <span className="text-muted flex items-center gap-1"><Minus className="w-3 h-3" />0</span>;
  };

  return (
    <div className="card-surface p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="font-semibold">Ölçüm & Gelişim Takibi</div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-subtle p-0.5 text-sm">
            <button onClick={() => handleTabChange("olcumler")}
              className={`px-3 py-1 rounded-md transition-colors ${tab === "olcumler" ? "bg-subtle-md text-white" : "text-label hover:text-white"}`}>
              Ölçümler
            </button>
            <button onClick={() => handleTabChange("fotograflar")}
              className={`px-3 py-1 rounded-md transition-colors ${tab === "fotograflar" ? "bg-subtle-md text-white" : "text-label hover:text-white"}`}>
              Fotoğraflar
            </button>
          </div>
          {tab === "olcumler" && (
            <button onClick={() => setFormOpen(true)} className="btn-primary btn-sm gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Ölçüm Ekle
            </button>
          )}
          {tab === "fotograflar" && (
            <>
              <button onClick={() => fileRef.current?.click()} disabled={photoUploading} className="btn-secondary btn-sm gap-1.5">
                {photoUploading ? "Yükleniyor…" : <><Upload className="w-3.5 h-3.5" />Fotoğraf Yükle</>}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </>
          )}
        </div>
      </div>

      {/* Photos tab */}
      {tab === "fotograflar" && (
        <div>
          {!photosLoaded ? (
            <div className="animate-pulse h-32 rounded-xl bg-subtle" />
          ) : photos.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-subtle-md rounded-xl">
              <Camera className="w-7 h-7 text-white/20 mx-auto mb-2" />
              <div className="text-sm text-faint">Henüz fotoğraf yok</div>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {photos.map((p) => (
                <div key={p.id} className="group relative rounded-xl overflow-hidden aspect-square bg-subtle">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imageUrl} alt={p.label || ""} className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform" onClick={() => setLightbox(p)} />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-[10px] text-white">{new Date(p.takenAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}</div>
                  </div>
                  <button onClick={() => handleDeletePhoto(p.id)}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)} className="absolute -top-10 right-0 text-body hover:text-white"><X className="w-5 h-5" /></button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.imageUrl} alt="" className="w-full rounded-2xl" />
            <div className="mt-3 text-sm text-body text-center">
              {new Date(lightbox.takenAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
      )}

      {tab === "olcumler" && (<>

      {/* Delta summary */}
      {measurements.length >= 2 && (
        <div className="grid grid-cols-4 gap-3">
          {METRICS.map(({ key, label, unit }) => {
            const d = delta(measurements, key);
            const last = measurements[measurements.length - 1][key];
            return (
              <div key={key} className="rounded-xl bg-subtle p-3 text-center">
                <div className="text-[10px] text-label uppercase tracking-wider">{label}</div>
                <div className="text-lg font-bold mt-1">{last != null ? `${last}${unit}` : "—"}</div>
                <div className="text-xs mt-0.5"><DeltaIcon v={d} /></div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart */}
      {measurements.length > 1 && (
        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {METRICS.map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => toggleMetric(key)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeMetrics.includes(key) ? "text-ink-950" : "bg-subtle text-muted"
                }`}
                style={activeMetrics.includes(key) ? { backgroundColor: color } : {}}
              >
                {label}
              </button>
            ))}
          </div>
          <MemberProgressChart
            data={chartData}
            lines={METRICS.filter((m) => activeMetrics.includes(m.key)).map(({ key, label, color }) => ({ key, label, color }))}
          />
        </div>
      )}

      {measurements.length === 0 && (
        <div className="text-center py-8 text-faint text-sm">Henüz ölçüm kaydı yok</div>
      )}

      {/* Measurement table */}
      {measurements.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-subtle">
                <th className="text-left py-2 text-muted font-medium">Tarih</th>
                <th className="text-right py-2 text-muted font-medium">Kilo</th>
                <th className="text-right py-2 text-muted font-medium">Yağ %</th>
                <th className="text-right py-2 text-muted font-medium">Kas %</th>
                <th className="text-right py-2 text-muted font-medium">Bel cm</th>
                <th className="text-right py-2 text-muted font-medium">Göğüs</th>
                <th className="text-right py-2 text-muted font-medium">Kalça</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {[...measurements].reverse().map((m) => (
                <tr key={m.id} className="border-b border-subtle hover:bg-subtle">
                  <td className="py-2 text-body">{formatDate(m.recordedAt)}</td>
                  <td className="py-2 text-right font-mono">{m.weightKg ?? "—"}</td>
                  <td className="py-2 text-right font-mono">{m.bodyFatPct ?? "—"}</td>
                  <td className="py-2 text-right font-mono">{m.musclePct ?? "—"}</td>
                  <td className="py-2 text-right font-mono">{m.waistCm ?? "—"}</td>
                  <td className="py-2 text-right font-mono">{m.chestCm ?? "—"}</td>
                  <td className="py-2 text-right font-mono">{m.hipCm ?? "—"}</td>
                  <td className="py-2">
                    <button onClick={() => handleDelete(m.id)}
                      className="p-1 rounded hover:bg-rose-500/10 text-faint hover:text-rose-400 transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add form modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setFormOpen(false)} />
          <div className="relative w-full max-w-lg card-surface rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Yeni Ölçüm</h2>
              <button onClick={() => setFormOpen(false)} className="p-1 rounded-lg hover:bg-subtle text-label"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs text-body mb-1.5">Tarih</label>
                <input type="date" className="input w-full" value={form.recordedAt} onChange={field("recordedAt")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { k: "weightKg",   l: "Kilo (kg)" },
                  { k: "bodyFatPct", l: "Yağ Oranı (%)" },
                  { k: "musclePct",  l: "Kas Oranı (%)" },
                  { k: "waistCm",    l: "Bel (cm)" },
                  { k: "chestCm",    l: "Göğüs (cm)" },
                  { k: "hipCm",      l: "Kalça (cm)" },
                  { k: "armCm",      l: "Kol (cm)" },
                  { k: "legCm",      l: "Bacak (cm)" },
                ].map(({ k, l }) => (
                  <div key={k}>
                    <label className="block text-xs text-body mb-1.5">{l}</label>
                    <input
                      type="number" step="0.1" min="0"
                      className="input w-full"
                      value={(form as any)[k]}
                      onChange={field(k as keyof typeof EMPTY_FORM)}
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs text-body mb-1.5">Notlar</label>
                <input className="input w-full" placeholder="İnBody analizi, antrenör notu..." value={form.notes} onChange={field("notes")} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setFormOpen(false)} className="btn-secondary btn-md flex-1">İptal</button>
                <button type="submit" disabled={saving} className="btn-primary btn-md flex-1">
                  {saving ? "Kaydediliyor…" : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>)}
    </div>
  );
}
