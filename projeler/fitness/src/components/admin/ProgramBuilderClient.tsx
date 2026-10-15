"use client";

import { useEffect, useState } from "react";
import {
  Plus, Trash2, ChevronDown, ChevronUp, Loader2, X, Check,
  Dumbbell, User, Calendar, Copy, BookOpen, Users,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

const DAY_NAMES = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const TODAY = new Date().toISOString().slice(0, 10);

interface Exercise {
  id?: string;
  name: string;
  sets: number | null;
  reps: string | null;
  durationSec: number | null;
  restSec: number | null;
  notes: string | null;
  order: number;
  videoUrl: string | null;
}

interface WorkoutDay {
  id?: string;
  dayNumber: number;
  label: string | null;
  exercises: Exercise[];
}

interface ProgramSummary {
  id: string;
  title: string;
  description?: string | null;
  memberName: string | null;
  trainerName: string | null;
  isActive: boolean;
  isTemplate: boolean;
  startDate: string;
  endDate: string | null;
  dayCount: number;
  exerciseCount: number;
  createdAt: string;
}

interface Props {
  initialPrograms: ProgramSummary[];
  members: { id: string; name: string }[];
  trainers: { id: string; name: string }[];
}

const EMPTY_EXERCISE = (): Exercise => ({
  name: "", sets: 3, reps: "8-12", durationSec: null, restSec: 60, notes: null, order: 0, videoUrl: null,
});

const EMPTY_FORM = { memberId: "", title: "", description: "", startDate: TODAY, endDate: "" };

export function ProgramBuilderClient({ initialPrograms, members, trainers }: Props) {
  const { toast } = useToast();
  const [programs, setPrograms] = useState(initialPrograms);
  const [tab, setTab] = useState<"programs" | "templates">("programs");
  const [view, setView] = useState<"list" | "builder">("list");
  const [builderMode, setBuilderMode] = useState<"program" | "template">("program");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [openDay, setOpenDay] = useState<number | null>(null);

  // Clone modal state
  const [cloneModal, setCloneModal] = useState<{ id: string; title: string } | null>(null);
  const [cloneForm, setCloneForm] = useState({ memberId: "", startDate: TODAY, endDate: "" });
  const [cloning, setCloning] = useState(false);

  // Egzersiz kütüphanesi: daha önce yazılan hareketler otomatik tamamlamada
  // önerilir, seçilince set/tekrar/süre alanları son kullanımdan dolar.
  const [library, setLibrary] = useState<Omit<Exercise, "order" | "notes">[]>([]);
  useEffect(() => {
    fetch("/api/exercises/library")
      .then((r) => r.json())
      .then((d) => setLibrary(d.exercises ?? []))
      .catch(() => {});
  }, []);

  function handleExerciseName(dayNumber: number, idx: number, value: string) {
    const match = library.find((l) => l.name.toLowerCase() === value.trim().toLowerCase());
    setDays((prev) => prev.map((d) =>
      d.dayNumber === dayNumber
        ? {
            ...d,
            exercises: d.exercises.map((e, i) =>
              i === idx
                ? match
                  ? { ...e, name: match.name, sets: match.sets, reps: match.reps, durationSec: match.durationSec, restSec: match.restSec, videoUrl: match.videoUrl }
                  : { ...e, name: value }
                : e
            ),
          }
        : d
    ));
  }

  const memberPrograms = programs.filter((p) => !p.isTemplate);
  const templates = programs.filter((p) => p.isTemplate);

  // ── Day / Exercise helpers ──

  function addDay() {
    const used = new Set(days.map((d) => d.dayNumber));
    const next = [1, 2, 3, 4, 5, 6, 7].find((d) => !used.has(d));
    if (!next) return;
    setDays((prev) => [...prev, { dayNumber: next, label: null, exercises: [EMPTY_EXERCISE()] }]);
    setOpenDay(next);
  }

  function removeDay(dayNumber: number) {
    setDays((prev) => prev.filter((d) => d.dayNumber !== dayNumber));
    if (openDay === dayNumber) setOpenDay(null);
  }

  function addExercise(dayNumber: number) {
    setDays((prev) => prev.map((d) =>
      d.dayNumber === dayNumber ? { ...d, exercises: [...d.exercises, EMPTY_EXERCISE()] } : d
    ));
  }

  function updateExercise(dayNumber: number, idx: number, field: keyof Exercise, value: unknown) {
    setDays((prev) => prev.map((d) =>
      d.dayNumber === dayNumber
        ? { ...d, exercises: d.exercises.map((e, i) => i === idx ? { ...e, [field]: value } : e) }
        : d
    ));
  }

  function removeExercise(dayNumber: number, idx: number) {
    setDays((prev) => prev.map((d) =>
      d.dayNumber === dayNumber ? { ...d, exercises: d.exercises.filter((_, i) => i !== idx) } : d
    ));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setDays([]);
    setOpenDay(null);
    setBuilderMode("program");
  }

  // ── Save new program or template ──

  async function handleSave() {
    if (!form.title) {
      toast({ type: "error", message: "Program adı zorunlu" });
      return;
    }
    if (builderMode === "program" && !form.memberId) {
      toast({ type: "error", message: "Üye seçimi zorunlu" });
      return;
    }
    setSaving(true);
    try {
      const isTemplate = builderMode === "template";
      const payload = {
        memberId: isTemplate ? null : form.memberId,
        isTemplate,
        title: form.title,
        description: form.description || null,
        startDate: new Date(form.startDate || TODAY).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        days: days.map((d) => ({
          dayNumber: d.dayNumber,
          label: d.label || null,
          exercises: d.exercises.map((e, j) => ({ ...e, order: j })),
        })),
      };

      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const memberName = isTemplate ? null : (members.find((m) => m.id === form.memberId)?.name ?? "—");
      setPrograms((prev) => [{
        id: data.id,
        title: data.title,
        memberName,
        trainerName: trainers[0]?.name ?? "—",
        isActive: true,
        isTemplate,
        startDate: data.startDate,
        endDate: data.endDate,
        dayCount: days.length,
        exerciseCount: days.reduce((s, d) => s + d.exercises.length, 0),
        createdAt: data.createdAt,
      }, ...prev]);

      toast({ type: "success", message: isTemplate ? "Şablon kaydedildi" : "Program oluşturuldu" });
      setView("list");
      setTab(isTemplate ? "templates" : "programs");
      resetForm();
    } catch (e: unknown) {
      toast({ type: "error", message: e instanceof Error ? e.message : "Hata" });
    } finally {
      setSaving(false);
    }
  }

  // ── Clone template → member program ──

  function openCloneModal(id: string, title: string) {
    setCloneModal({ id, title });
    setCloneForm({ memberId: "", startDate: TODAY, endDate: "" });
  }

  async function handleClone() {
    if (!cloneModal || !cloneForm.memberId) {
      toast({ type: "error", message: "Üye seçimi zorunlu" });
      return;
    }
    setCloning(true);
    try {
      const res = await fetch(`/api/programs/${cloneModal.id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: cloneForm.memberId,
          startDate: new Date(cloneForm.startDate).toISOString(),
          endDate: cloneForm.endDate ? new Date(cloneForm.endDate).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const memberName = members.find((m) => m.id === cloneForm.memberId)?.name ?? "—";
      const sourceTrainer = programs.find((p) => p.id === cloneModal.id)?.trainerName ?? null;

      setPrograms((prev) => [{
        id: data.id,
        title: data.title,
        memberName,
        trainerName: sourceTrainer,
        isActive: true,
        isTemplate: false,
        startDate: data.startDate,
        endDate: data.endDate,
        dayCount: data.days?.length ?? 0,
        exerciseCount: (data.days as { exercises: unknown[] }[] | undefined)
          ?.reduce((s, d) => s + d.exercises.length, 0) ?? 0,
        createdAt: data.createdAt,
      }, ...prev]);

      toast({ type: "success", message: `Program "${memberName}" üyesine atandı` });
      setCloneModal(null);
      setTab("programs");
    } catch (e: unknown) {
      toast({ type: "error", message: e instanceof Error ? e.message : "Hata" });
    } finally {
      setCloning(false);
    }
  }

  // ── Save existing member program as template ──

  async function saveAsTemplate(p: ProgramSummary) {
    try {
      const res = await fetch(`/api/programs/${p.id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPrograms((prev) => [{
        id: data.id,
        title: data.title,
        memberName: null,
        trainerName: p.trainerName,
        isActive: true,
        isTemplate: true,
        startDate: data.startDate,
        endDate: data.endDate,
        dayCount: p.dayCount,
        exerciseCount: p.exerciseCount,
        createdAt: data.createdAt,
      }, ...prev]);

      toast({ type: "success", message: "Şablon olarak kaydedildi" });
      setTab("templates");
    } catch (e: unknown) {
      toast({ type: "error", message: e instanceof Error ? e.message : "Hata" });
    }
  }

  // ── Toggle active / Delete ──

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/programs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    if (res.ok) setPrograms((prev) => prev.map((p) => p.id === id ? { ...p, isActive: !current } : p));
  }

  async function deleteProgram(id: string, isTemplate: boolean) {
    const label = isTemplate ? "şablonu" : "programı";
    if (!confirm(`Bu ${label} silmek istediğine emin misin?`)) return;
    const res = await fetch(`/api/programs/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPrograms((prev) => prev.filter((p) => p.id !== id));
      toast({ type: "success", message: `${isTemplate ? "Şablon" : "Program"} silindi` });
    }
  }

  // ── Builder view ──

  if (view === "builder") {
    return (
      <div className="space-y-6">
        <datalist id="exercise-library">
          {library.map((l) => (
            <option key={l.name} value={l.name} />
          ))}
        </datalist>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-body">Salon Yönetimi</div>
            <h1 className="text-2xl font-bold mt-0.5">
              {builderMode === "template" ? "Yeni Şablon Oluştur" : "Yeni Program Oluştur"}
            </h1>
          </div>
          <button onClick={() => { setView("list"); resetForm(); }} className="btn-secondary btn-sm">
            <X className="w-4 h-4" /> İptal
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-subtle rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setBuilderMode("program")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${builderMode === "program" ? "bg-neon text-ink-950" : "text-body hover:text-white"}`}
          >
            <User className="w-3.5 h-3.5" /> Üye Programı
          </button>
          <button
            type="button"
            onClick={() => setBuilderMode("template")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${builderMode === "template" ? "bg-neon text-ink-950" : "text-body hover:text-white"}`}
          >
            <BookOpen className="w-3.5 h-3.5" /> Şablon
          </button>
        </div>

        {/* Form */}
        <div className="card-surface p-6 space-y-4">
          <div className={`grid gap-4 ${builderMode === "program" ? "sm:grid-cols-2" : ""}`}>
            {builderMode === "program" && (
              <div>
                <label className="label-base">Üye *</label>
                <select className="input-base" value={form.memberId} onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}>
                  <option value="">Üye Seçin</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label-base">{builderMode === "template" ? "Şablon Adı *" : "Program Adı *"}</label>
              <input
                className="input-base"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={builderMode === "template" ? "PPL Programı, Başlangıç Full Body…" : "8 Haftalık Güç Programı"}
              />
            </div>
          </div>
          <div>
            <label className="label-base">Açıklama</label>
            <input
              className="input-base"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Kısa açıklama"
            />
          </div>
          {builderMode === "program" && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label-base">Başlangıç *</label>
                <input type="date" className="input-base" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="label-base">Bitiş</label>
                <input type="date" className="input-base" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
          )}
        </div>

        {/* Days */}
        <div className="space-y-3">
          {days.sort((a, b) => a.dayNumber - b.dayNumber).map((day) => (
            <div key={day.dayNumber} className="card-surface overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-subtle"
                onClick={() => setOpenDay(openDay === day.dayNumber ? null : day.dayNumber)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-neon/10 grid place-items-center text-xs font-bold text-neon">
                    {day.dayNumber}
                  </div>
                  <div>
                    <div className="font-medium">{DAY_NAMES[day.dayNumber - 1]}</div>
                    {day.label && <div className="text-xs text-muted">{day.label}</div>}
                  </div>
                  <span className="badge badge-neutral text-xs">{day.exercises.length} egzersiz</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); removeDay(day.dayNumber); }}
                    className="btn-ghost btn-sm p-1.5 text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {openDay === day.dayNumber ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                </div>
              </div>

              {openDay === day.dayNumber && (
                <div className="border-t border-subtle p-4 space-y-4">
                  <div>
                    <label className="label-base">Gün Etiketi</label>
                    <input
                      className="input-base"
                      placeholder="Üst Vücut, Bacak, Kardiyo…"
                      value={day.label ?? ""}
                      onChange={(e) => setDays((prev) => prev.map((d) =>
                        d.dayNumber === day.dayNumber ? { ...d, label: e.target.value || null } : d
                      ))}
                    />
                  </div>

                  <div className="space-y-3">
                    {day.exercises.map((ex, idx) => (
                      <div key={idx} className="bg-ink-800/50 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted font-mono w-5">{idx + 1}</span>
                          <input
                            className="input-base flex-1"
                            placeholder="Egzersiz adı *"
                            list="exercise-library"
                            value={ex.name}
                            onChange={(e) => handleExerciseName(day.dayNumber, idx, e.target.value)}
                          />
                          <button
                            onClick={() => removeExercise(day.dayNumber, idx)}
                            className="btn-ghost btn-sm p-1.5 text-rose-400 shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="text-xs text-muted mb-1 block">Set</label>
                            <input
                              type="number" min={1} className="input-base text-sm"
                              value={ex.sets ?? ""}
                              onChange={(e) => updateExercise(day.dayNumber, idx, "sets", e.target.value ? Number(e.target.value) : null)}
                              placeholder="3"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted mb-1 block">Tekrar</label>
                            <input
                              className="input-base text-sm"
                              value={ex.reps ?? ""}
                              onChange={(e) => updateExercise(day.dayNumber, idx, "reps", e.target.value || null)}
                              placeholder="8-12"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted mb-1 block">Süre (sn)</label>
                            <input
                              type="number" min={0} className="input-base text-sm"
                              value={ex.durationSec ?? ""}
                              onChange={(e) => updateExercise(day.dayNumber, idx, "durationSec", e.target.value ? Number(e.target.value) : null)}
                              placeholder="—"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted mb-1 block">Dinlenme</label>
                            <input
                              type="number" min={0} className="input-base text-sm"
                              value={ex.restSec ?? ""}
                              onChange={(e) => updateExercise(day.dayNumber, idx, "restSec", e.target.value ? Number(e.target.value) : null)}
                              placeholder="60"
                            />
                          </div>
                        </div>
                        <input
                          className="input-base text-sm"
                          value={ex.notes ?? ""}
                          onChange={(e) => updateExercise(day.dayNumber, idx, "notes", e.target.value || null)}
                          placeholder="Not (isteğe bağlı)"
                        />
                      </div>
                    ))}
                  </div>

                  <button onClick={() => addExercise(day.dayNumber)} className="btn-ghost btn-sm text-neon">
                    <Plus className="w-4 h-4" /> Egzersiz Ekle
                  </button>
                </div>
              )}
            </div>
          ))}

          {days.length < 7 && (
            <button onClick={addDay} className="btn-secondary btn-md w-full">
              <Plus className="w-4 h-4" /> Antrenman Günü Ekle
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setView("list"); resetForm(); }} className="btn-secondary btn-md flex-1">İptal</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary btn-md flex-1">
            {saving
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><Check className="w-4 h-4" /> {builderMode === "template" ? "Şablonu Kaydet" : "Programı Kaydet"}</>
            }
          </button>
        </div>
      </div>
    );
  }

  // ── List view ──

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-body">Salon Yönetimi</div>
            <h1 className="text-2xl font-bold mt-0.5">Antrenman Programları</h1>
          </div>
          <button onClick={() => setView("builder")} className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Yeni Program
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-subtle">
          {(["programs", "templates"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t ? "border-neon text-neon" : "border-transparent text-body hover:text-white"
              }`}
            >
              {t === "programs" ? <User className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
              {t === "programs" ? "Üye Programları" : "Şablonlar"}
              <span className="badge badge-neutral text-[10px] px-1.5">
                {t === "programs" ? memberPrograms.length : templates.length}
              </span>
            </button>
          ))}
        </div>

        {/* Programs tab */}
        {tab === "programs" && (
          <div className="card-surface overflow-hidden">
            {memberPrograms.length === 0 ? (
              <div className="p-12 text-center">
                <Dumbbell className="w-10 h-10 text-neon/20 mx-auto" />
                <div className="mt-4 text-muted">Henüz üye programı yok.</div>
                <button onClick={() => setView("builder")} className="mt-4 btn-primary btn-sm">İlk Programı Oluştur</button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-subtle">
                  <tr className="text-xs uppercase text-muted">
                    <th className="text-left px-5 py-3">Program</th>
                    <th className="text-left px-5 py-3 hidden md:table-cell">Üye</th>
                    <th className="text-left px-5 py-3 hidden lg:table-cell">Antrenör</th>
                    <th className="text-center px-5 py-3">İçerik</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">Tarih</th>
                    <th className="text-center px-5 py-3">Durum</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {memberPrograms.map((p) => (
                    <tr key={p.id} className="hover:bg-subtle">
                      <td className="px-5 py-3 font-medium">{p.title}</td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className="flex items-center gap-1.5 text-body">
                          <User className="w-3.5 h-3.5" />{p.memberName ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell text-body">{p.trainerName ?? "—"}</td>
                      <td className="px-5 py-3 text-center text-xs text-label">
                        {p.dayCount} gün · {p.exerciseCount} egzersiz
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell text-xs text-muted">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(p.startDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                          {p.endDate && ` → ${new Date(p.endDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}`}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => toggleActive(p.id, p.isActive)}
                          className={`badge cursor-pointer ${p.isActive ? "badge-success" : "badge-neutral"}`}
                        >
                          {p.isActive ? "Aktif" : "Pasif"}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => saveAsTemplate(p)}
                            title="Şablon Olarak Kaydet"
                            className="btn-ghost btn-sm p-1.5 text-muted hover:text-neon"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteProgram(p.id, false)}
                            className="btn-ghost btn-sm p-1.5 text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Templates tab */}
        {tab === "templates" && (
          <div className="card-surface overflow-hidden">
            {templates.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen className="w-10 h-10 text-neon/20 mx-auto" />
                <div className="mt-4 text-muted">Henüz şablon yok.</div>
                <div className="text-xs text-faint mt-1">
                  Mevcut üye programlarını şablona dönüştürebilir (
                  <Copy className="w-3 h-3 inline" /> butonu) ya da sıfırdan oluşturabilirsin.
                </div>
                <button
                  onClick={() => { setBuilderMode("template"); setView("builder"); }}
                  className="mt-4 btn-primary btn-sm"
                >
                  Şablon Oluştur
                </button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-subtle">
                  <tr className="text-xs uppercase text-muted">
                    <th className="text-left px-5 py-3">Şablon</th>
                    <th className="text-left px-5 py-3 hidden lg:table-cell">Antrenör</th>
                    <th className="text-center px-5 py-3">İçerik</th>
                    <th className="text-left px-5 py-3 hidden sm:table-cell">Oluşturulma</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {templates.map((t) => (
                    <tr key={t.id} className="hover:bg-subtle">
                      <td className="px-5 py-3">
                        <div className="font-medium">{t.title}</div>
                        {t.description && <div className="text-xs text-muted mt-0.5 max-w-xs truncate">{t.description}</div>}
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell text-body">{t.trainerName ?? "—"}</td>
                      <td className="px-5 py-3 text-center text-xs text-label">
                        {t.dayCount} gün · {t.exerciseCount} egzersiz
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell text-xs text-muted">
                        {new Date(t.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openCloneModal(t.id, t.title)}
                            className="btn-secondary btn-sm text-xs gap-1.5"
                          >
                            <Users className="w-3.5 h-3.5" /> Üyeye Ata
                          </button>
                          <button
                            onClick={() => deleteProgram(t.id, true)}
                            className="btn-ghost btn-sm p-1.5 text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Clone modal */}
      {cloneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card-surface w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Üyeye Ata</h2>
              <button onClick={() => setCloneModal(null)} className="btn-ghost p-1.5 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-body">
              <span className="text-white font-medium">&ldquo;{cloneModal.title}&rdquo;</span> şablonunu seçtiğin üyeye kopyalar.
            </p>
            <div>
              <label className="label-base">Üye *</label>
              <select
                className="input-base"
                value={cloneForm.memberId}
                onChange={(e) => setCloneForm((f) => ({ ...f, memberId: e.target.value }))}
              >
                <option value="">Üye Seçin</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-base">Başlangıç *</label>
                <input
                  type="date"
                  className="input-base"
                  value={cloneForm.startDate}
                  onChange={(e) => setCloneForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="label-base">Bitiş</label>
                <input
                  type="date"
                  className="input-base"
                  value={cloneForm.endDate}
                  onChange={(e) => setCloneForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setCloneModal(null)} className="btn-secondary btn-md flex-1">İptal</button>
              <button
                onClick={handleClone}
                disabled={cloning || !cloneForm.memberId}
                className="btn-primary btn-md flex-1"
              >
                {cloning ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Ata</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
