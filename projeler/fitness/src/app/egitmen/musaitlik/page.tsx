"use client";

import { useEffect, useState } from "react";
import { Clock, Save, Plus, Trash2, CheckCircle, Plane, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

type Slot = { dayOfWeek: number; startTime: string; endTime: string; _key: string };
type TimeOff = { id: string; startDate: string; endDate: string; reason: string | null };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

let _keyCounter = 0;
function makeKey() { return `slot-${++_keyCounter}-${Date.now()}`; }

export default function MusaitlikPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [timeOff, setTimeOff] = useState<TimeOff[]>([]);
  const [toForm, setToForm] = useState({ startDate: "", endDate: "", reason: "" });
  const [toSaving, setToSaving] = useState(false);
  const [toError, setToError] = useState("");
  const [toWarning, setToWarning] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/trainer/availability").then((r) => r.json()),
      fetch("/api/trainer/timeoff").then((r) => r.json()),
    ])
      .then(([availData, toData]) => {
        setSlots(
          (availData.slots ?? []).map((s: Omit<Slot, "_key">) => ({ ...s, _key: makeKey() }))
        );
        setTimeOff(toData.items ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function addTimeOff() {
    if (!toForm.startDate || !toForm.endDate) { setToError("Başlangıç ve bitiş tarihi seç"); return; }
    setToSaving(true); setToError(""); setToWarning("");
    try {
      const res = await fetch("/api/trainer/timeoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toForm),
      });
      const data = await res.json();
      if (!res.ok) { setToError(data.error || "Eklenemedi"); return; }
      setTimeOff((prev) => [...prev, data.item].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      setToForm({ startDate: "", endDate: "", reason: "" });
      if (data.affectedAppointments > 0) {
        setToWarning(`Bu aralıkta ${data.affectedAppointments} planlanmış randevun var — Randevularım sayfasından iptal etmeyi unutma.`);
      }
    } finally {
      setToSaving(false);
    }
  }

  async function removeTimeOff(id: string) {
    await fetch(`/api/trainer/timeoff/${id}`, { method: "DELETE" });
    setTimeOff((prev) => prev.filter((t) => t.id !== id));
  }

  function addSlot(day: number) {
    setSlots((prev) => [...prev, { dayOfWeek: day, startTime: "09:00", endTime: "17:00", _key: makeKey() }]);
  }

  function removeSlot(k: string) {
    setSlots((prev) => prev.filter((s) => s._key !== k));
  }

  function updateSlot(k: string, field: "startTime" | "endTime", value: string) {
    setSlots((prev) => prev.map((s) => (s._key === k ? { ...s, [field]: value } : s)));
  }

  async function handleSave() {
    setError("");
    for (const s of slots) {
      if (s.startTime >= s.endTime) {
        setError("Bitiş saati başlangıç saatinden sonra olmalıdır.");
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch("/api/trainer/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slots.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }))),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Kayıt başarısız"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 max-w-2xl">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="card-surface rounded-xl h-20 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Müsaitlik Saatleri</h1>
        <p className="text-body text-sm mt-0.5">
          Hangi günlerde, hangi saatler arasında randevu alabileceğinizi belirleyin.
        </p>
      </div>

      <div className="space-y-3">
        {DAYS.map((label, day) => {
          const daySlots = slots.filter((s) => s.dayOfWeek === day);
          return (
            <div key={day} className="card-surface p-5 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className={`font-semibold text-sm ${daySlots.length > 0 ? "text-primary" : "text-muted"}`}>
                  {label}
                </span>
                <button
                  onClick={() => addSlot(day)}
                  className="flex items-center gap-1.5 text-xs text-neon hover:text-neon/70 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Saat ekle
                </button>
              </div>

              {daySlots.length === 0 ? (
                <p className="text-xs text-faint italic">Bu gün için müsaitlik girilmemiş.</p>
              ) : (
                <div className="space-y-2">
                  {daySlots.map((slot) => (
                    <div key={slot._key} className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted shrink-0" />
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateSlot(slot._key, "startTime", e.target.value)}
                        className="input-base rounded-lg px-3 py-1.5 text-sm w-32"
                      />
                      <span className="text-muted text-sm">–</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateSlot(slot._key, "endTime", e.target.value)}
                        className="input-base rounded-lg px-3 py-1.5 text-sm w-32"
                      />
                      <button
                        onClick={() => removeSlot(slot._key)}
                        className="p-1.5 rounded-lg hover:bg-red-400/10 text-muted hover:text-red-400 transition-colors ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-neon text-ink-950 font-semibold text-sm hover:bg-neon/90 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            Kaydedildi
          </span>
        )}
      </div>

      {/* İzinli günler */}
      <div className="pt-4 border-t border-subtle space-y-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Plane className="w-4 h-4 text-sky-300" /> İzinli Günler
          </h2>
          <p className="text-body text-sm mt-0.5">
            Bu tarih aralıklarında üyeler senden randevu alamaz.
          </p>
        </div>

        <div className="card-surface p-5 rounded-xl space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-body mb-1.5">Başlangıç</label>
              <input
                type="date"
                value={toForm.startDate}
                onChange={(e) => setToForm((f) => ({ ...f, startDate: e.target.value, endDate: f.endDate || e.target.value }))}
                className="input-base rounded-lg px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-body mb-1.5">Bitiş</label>
              <input
                type="date"
                value={toForm.endDate}
                min={toForm.startDate || undefined}
                onChange={(e) => setToForm((f) => ({ ...f, endDate: e.target.value }))}
                className="input-base rounded-lg px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs text-body mb-1.5">Sebep (opsiyonel)</label>
              <input
                value={toForm.reason}
                onChange={(e) => setToForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Tatil, sağlık..."
                className="input-base rounded-lg px-3 py-1.5 text-sm w-full"
              />
            </div>
            <button
              onClick={addTimeOff}
              disabled={toSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-subtle border border-subtle text-sm hover:border-neon/40 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Ekle
            </button>
          </div>
          {toError && <p className="text-sm text-red-400">{toError}</p>}
          {toWarning && (
            <p className="text-sm text-amber-300 flex items-start gap-1.5">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {toWarning}
            </p>
          )}

          {timeOff.length === 0 ? (
            <p className="text-xs text-faint italic">Planlanmış izin yok.</p>
          ) : (
            <div className="space-y-2">
              {timeOff.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-subtle">
                  <div className="text-sm">
                    <span className="font-medium">
                      {fmtDate(t.startDate)}
                      {t.startDate.slice(0, 10) !== t.endDate.slice(0, 10) && ` — ${fmtDate(t.endDate)}`}
                    </span>
                    {t.reason && <span className="text-xs text-muted ml-2">{t.reason}</span>}
                  </div>
                  <button
                    onClick={() => removeTimeOff(t.id)}
                    className="p-1.5 rounded-lg hover:bg-red-400/10 text-muted hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
