"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, ChevronRight, ChevronLeft, Clock, Calendar, Check, Loader2, User } from "lucide-react";

interface Trainer {
  id: string;
  name: string;
  avatarUrl: string | null;
  specialty: string | null;
  experience: number;
  rating: number;
  availableDays: number[];
}

const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const DURATION_OPTIONS = [
  { value: 30, label: "30 dk" },
  { value: 60, label: "1 saat" },
  { value: 90, label: "1.5 saat" },
];

function next14Days() {
  const days: { date: Date; label: string; value: string }[] = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    const jsDow = d.getDay();
    const schemaDow = jsDow === 0 ? 6 : jsDow - 1;
    days.push({
      date: d,
      label: `${DAY_NAMES[schemaDow]} ${d.getDate()} ${d.toLocaleDateString("tr-TR", { month: "short" })}`,
      value: d.toISOString().slice(0, 10),
    });
  }
  return days;
}

export function BookAppointmentClient({ trainers }: { trainers: Trainer[] }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotReason, setSlotReason] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = next14Days();

  async function fetchSlots(trainerId: string, date: string, dur: number) {
    setLoadingSlots(true);
    setSlots([]);
    setSlotReason("");
    setSelectedSlot("");
    try {
      const res = await fetch(`/api/panel/appointments/slots?trainerId=${trainerId}&date=${date}&duration=${dur}`);
      const data = await res.json();
      setSlots(data.slots ?? []);
      setSlotReason(data.reason ?? "");
    } finally {
      setLoadingSlots(false);
    }
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    if (selectedTrainer && date) fetchSlots(selectedTrainer.id, date, duration);
  }

  function handleDurationChange(dur: number) {
    setDuration(dur);
    if (selectedTrainer && selectedDate) fetchSlots(selectedTrainer.id, selectedDate, dur);
  }

  async function handleBook() {
    if (!selectedTrainer || !selectedDate || !selectedSlot) return;
    setBooking(true);
    setError(null);
    try {
      const res = await fetch("/api/panel/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainerId: selectedTrainer.id,
          date: selectedDate,
          slot: selectedSlot,
          durationMin: duration,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push("/panel/antrenman?booked=1");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bir hata oluştu");
      setBooking(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Adım göstergesi */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as const).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full grid place-items-center text-xs font-bold transition-colors ${
              step > s ? "bg-neon text-ink-950" : step === s ? "bg-neon/20 text-neon ring-1 ring-neon" : "bg-subtle-md text-muted"
            }`}>
              {step > s ? <Check className="w-3.5 h-3.5" /> : s}
            </div>
            <span className={`text-sm ${step === s ? "text-strong" : "text-muted"}`}>
              {s === 1 ? "Antrenör" : s === 2 ? "Tarih & Saat" : "Onayla"}
            </span>
            {s < 3 && <ChevronRight className="w-4 h-4 text-white/20" />}
          </div>
        ))}
      </div>

      {/* ADIM 1 — Antrenör seç */}
      {step === 1 && (
        <div className="space-y-3">
          {trainers.length === 0 && (
            <div className="card-surface p-12 text-center text-muted">Aktif antrenör bulunamadı.</div>
          )}
          {trainers.map((t) => (
            <button
              key={t.id}
              onClick={() => { setSelectedTrainer(t); setStep(2); }}
              className="card-surface p-5 flex items-center gap-4 w-full text-left hover:border-neon/20 transition-colors group"
            >
              <div className="w-12 h-12 rounded-xl bg-neon/10 grid place-items-center shrink-0 group-hover:bg-neon/20 transition-colors">
                {t.avatarUrl ? (
                  <img src={t.avatarUrl} alt={t.name} className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <User className="w-6 h-6 text-neon" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{t.name}</div>
                <div className="text-sm text-label mt-0.5">{t.specialty ?? "Genel Antrenman"} · {t.experience} yıl deneyim</div>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted">
                  <span className="text-amber-400">{'★'.repeat(Math.round(t.rating))}</span>
                  <span>{t.rating.toFixed(1)}</span>
                  <span className="mx-1">·</span>
                  <Calendar className="w-3 h-3" />
                  <span>{t.availableDays.map((d) => DAY_NAMES[d]).join(", ")}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-faint group-hover:text-neon transition-colors shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* ADIM 2 — Tarih & Saat */}
      {step === 2 && selectedTrainer && (
        <div className="space-y-5">
          <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-label hover:text-neon transition-colors">
            <ChevronLeft className="w-4 h-4" /> {selectedTrainer.name}
          </button>

          {/* Süre */}
          <div>
            <div className="text-sm font-medium text-dim mb-2">Süre</div>
            <div className="flex gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => handleDurationChange(d.value)}
                  className={`px-4 py-2 rounded-xl text-sm border transition-colors ${
                    duration === d.value ? "bg-neon text-ink-950 border-neon font-medium" : "border-subtle-md text-body hover:border-white/20"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tarih */}
          <div>
            <div className="text-sm font-medium text-dim mb-2">Tarih</div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {days.map((d) => {
                const jsDow = d.date.getDay();
                const schemaDow = jsDow === 0 ? 6 : jsDow - 1;
                const available = selectedTrainer.availableDays.includes(schemaDow);
                return (
                  <button
                    key={d.value}
                    disabled={!available}
                    onClick={() => handleDateChange(d.value)}
                    className={`p-2 rounded-xl text-xs text-center transition-colors border ${
                      !available ? "opacity-30 cursor-not-allowed border-subtle text-faint" :
                      selectedDate === d.value ? "bg-neon text-ink-950 border-neon font-bold" :
                      "border-subtle-md text-dim hover:border-white/25"
                    }`}
                  >
                    <div className="font-medium">{DAY_NAMES[schemaDow]}</div>
                    <div>{d.date.getDate()}</div>
                    <div className="text-[10px] opacity-70">{d.date.toLocaleDateString("tr-TR", { month: "short" })}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Saatler */}
          {selectedDate && (
            <div>
              <div className="text-sm font-medium text-dim mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Müsait Saatler
              </div>
              {loadingSlots ? (
                <div className="flex items-center gap-2 text-sm text-muted py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…
                </div>
              ) : slots.length === 0 ? (
                <div className="text-sm text-muted py-4">
                  {slotReason || "Bu tarihte müsait saat yok."}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSlot(s)}
                      className={`px-4 py-2 rounded-xl text-sm border transition-colors ${
                        selectedSlot === s ? "bg-neon text-ink-950 border-neon font-bold" : "border-subtle-md text-dim hover:border-white/25"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-secondary btn-md flex-1">Geri</button>
            <button
              disabled={!selectedDate || !selectedSlot}
              onClick={() => setStep(3)}
              className="btn-primary btn-md flex-1"
            >
              Devam Et <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ADIM 3 — Onayla */}
      {step === 3 && selectedTrainer && selectedDate && selectedSlot && (
        <div className="space-y-5">
          <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-label hover:text-neon transition-colors">
            <ChevronLeft className="w-4 h-4" /> Tarih & Saat
          </button>

          <div className="card-surface p-6 space-y-4">
            <div className="text-sm font-semibold text-body uppercase tracking-wider mb-4">Randevu Özeti</div>
            <div className="flex items-center gap-3 py-2 border-b border-subtle">
              <User className="w-4 h-4 text-neon shrink-0" />
              <div className="text-sm text-body">Antrenör</div>
              <div className="ml-auto font-medium">{selectedTrainer.name}</div>
            </div>
            <div className="flex items-center gap-3 py-2 border-b border-subtle">
              <Calendar className="w-4 h-4 text-neon shrink-0" />
              <div className="text-sm text-body">Tarih</div>
              <div className="ml-auto font-medium">
                {new Date(selectedDate).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
              </div>
            </div>
            <div className="flex items-center gap-3 py-2 border-b border-subtle">
              <Clock className="w-4 h-4 text-neon shrink-0" />
              <div className="text-sm text-body">Saat</div>
              <div className="ml-auto font-medium">{selectedSlot} · {DURATION_OPTIONS.find((d) => d.value === duration)?.label}</div>
            </div>
            <div>
              <label className="label-base mt-2">Not (isteğe bağlı)</label>
              <textarea
                className="input-base resize-none"
                rows={2}
                placeholder="Antrenöre iletmek istediğin bir not…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-secondary btn-md flex-1">Geri</button>
            <button onClick={handleBook} disabled={booking} className="btn-primary btn-md flex-1">
              {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Randevuyu Onayla</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
