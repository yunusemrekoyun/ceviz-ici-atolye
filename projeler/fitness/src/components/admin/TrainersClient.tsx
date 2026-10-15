"use client";

import { useState } from "react";
import { Star, Users, Calendar, Edit2, Trash2, Plus, X, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { ImageUploadInput } from "@/components/ui/ImageUploadInput";
import { initials } from "@/lib/utils";
import { api } from "@/lib/api";

interface Availability { id: string; dayOfWeek: number; startTime: string; endTime: string }
interface TrainerUser { name: string; email: string; avatarUrl: string | null }
interface Trainer {
  id: string;
  userId: string;
  specialty: string | null;
  bio: string | null;
  experience: number;
  rating: number;
  isActive: boolean;
  user: TrainerUser;
  availabilities: Availability[];
  _count: { members: number; appointments: number };
}

interface FormState {
  name: string; email: string; specialty: string; bio: string;
  experience: string; rating: string; avatarUrl: string;
}
const EMPTY_FORM: FormState = { name: "", email: "", specialty: "", bio: "", experience: "0", rating: "0", avatarUrl: "" };

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const TIME_SLOTS = Array.from({ length: 27 }, (_, i) => {
  const h = Math.floor((i * 30 + 6 * 60) / 60);
  const m = (i * 30 + 6 * 60) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

function trainerToForm(t: Trainer): FormState {
  return {
    name: t.user.name, email: t.user.email, specialty: t.specialty ?? "",
    bio: t.bio ?? "", experience: String(t.experience), rating: String(t.rating),
    avatarUrl: t.user.avatarUrl ?? "",
  };
}

export function TrainersClient({ initialTrainers }: { initialTrainers: Trainer[] }) {
  const { toast } = useToast();
  const [trainers, setTrainers] = useState<Trainer[]>(initialTrainers);
  const [modal, setModal] = useState<"create" | "edit" | "avail" | null>(null);
  const [editing, setEditing] = useState<Trainer | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Trainer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Availability state
  const [availSlots, setAvailSlots] = useState<{ dayOfWeek: number; startTime: string; endTime: string }[]>([]);
  const [savingAvail, setSavingAvail] = useState(false);

  function openCreate() { setEditing(null); setForm(EMPTY_FORM); setModal("create"); }
  function openEdit(t: Trainer) { setEditing(t); setForm(trainerToForm(t)); setModal("edit"); }
  function openAvail(t: Trainer) {
    setEditing(t);
    setAvailSlots(t.availabilities.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })));
    setModal("avail");
  }

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = {
      name: form.name, email: form.email, specialty: form.specialty || undefined,
      bio: form.bio || undefined, experience: parseInt(form.experience) || 0,
      rating: parseFloat(form.rating) || 0,
      avatarUrl: form.avatarUrl || undefined,
    };
    try {
      if (editing) {
        const updated = await api.patch<Trainer>(`/api/trainers/${editing.id}`, body);
        setTrainers((prev) => prev.map((t) => t.id === updated.id ? { ...t, ...updated } : t));
        toast({ type: "success", message: "Eğitmen güncellendi." });
      } else {
        const created = await api.post<{ id: string }>("/api/trainers", body);
        // Refetch full list to get _count etc
        const all = await api.get<Trainer[]>("/api/trainers");
        setTrainers(all);
        toast({ type: "success", message: "Eğitmen oluşturuldu. Şifre belirleme bağlantısı e-postasına gönderildi." });
      }
      setModal(null);
    } catch (e: any) {
      toast({ type: "error", message: e.message || "Hata oluştu." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del(`/api/trainers/${deleteTarget.id}`);
      setTrainers((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      toast({ type: "success", message: `"${deleteTarget.user.name}" silindi.` });
      setDeleteTarget(null);
    } catch (e: any) {
      toast({ type: "error", message: e.message || "Silinemedi." });
    } finally {
      setDeleting(false);
    }
  }

  async function toggleActive(t: Trainer) {
    try {
      const updated = await api.patch<Trainer>(`/api/trainers/${t.id}`, { isActive: !t.isActive });
      setTrainers((prev) => prev.map((x) => x.id === t.id ? { ...x, isActive: updated.isActive } : x));
      toast({ type: "success", message: updated.isActive ? "Eğitmen aktifleştirildi." : "Eğitmen pasife alındı." });
    } catch {
      toast({ type: "error", message: "Durum güncellenemedi." });
    }
  }

  async function saveAvailability() {
    if (!editing) return;
    setSavingAvail(true);
    try {
      const slots = await api.post<Availability[]>(`/api/trainers/${editing.id}/availability`, availSlots);
      setTrainers((prev) => prev.map((t) => t.id === editing.id ? { ...t, availabilities: slots as any } : t));
      toast({ type: "success", message: "Müsaitlik takvimi kaydedildi." });
      setModal(null);
    } catch {
      toast({ type: "error", message: "Kaydedilemedi." });
    } finally {
      setSavingAvail(false);
    }
  }

  function toggleDay(day: number) {
    setAvailSlots((prev) => {
      const exists = prev.find((s) => s.dayOfWeek === day);
      if (exists) return prev.filter((s) => s.dayOfWeek !== day);
      return [...prev, { dayOfWeek: day, startTime: "09:00", endTime: "18:00" }].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    });
  }

  function updateSlotTime(day: number, field: "startTime" | "endTime", val: string) {
    setAvailSlots((prev) => prev.map((s) => s.dayOfWeek === day ? { ...s, [field]: val } : s));
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Eğitmenler</h1>
          <p className="text-sm text-label mt-1">{trainers.length} eğitmen</p>
        </div>
        <button onClick={openCreate} className="btn-primary btn-md"><Plus className="w-4 h-4" /> Yeni Eğitmen</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trainers.length === 0 && (
          <div className="card-surface p-10 text-center text-muted col-span-full">Henüz eğitmen yok</div>
        )}
        {trainers.map((t) => (
          <div key={t.id} className={`card-surface p-6 flex flex-col gap-4 ${!t.isActive ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-4">
              {t.user.avatarUrl ? (
                <img src={t.user.avatarUrl} alt="" className="w-14 h-14 rounded-2xl object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon to-accent-cyan grid place-items-center text-ink-950 font-bold text-lg">
                  {initials(t.user.name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{t.user.name}</div>
                <div className="text-xs text-body truncate">{t.specialty || "—"}</div>
                <div className="mt-1 flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1"><Star className="w-3 h-3 fill-neon text-neon" />{Number(t.rating).toFixed(1)}</span>
                  <span className="text-muted">{t.experience} yıl</span>
                </div>
              </div>
              <button onClick={() => toggleActive(t)} title={t.isActive ? "Pasife al" : "Aktifleştir"}>
                {t.isActive
                  ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                  : <XCircle className="w-5 h-5 text-faint" />}
              </button>
            </div>

            {t.bio && <p className="text-sm text-dim line-clamp-2">{t.bio}</p>}

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-subtle py-2">
                <div className="text-lg font-bold">{t._count.members}</div>
                <div className="text-[10px] text-label">Üye</div>
              </div>
              <div className="rounded-lg bg-subtle py-2">
                <div className="text-lg font-bold">{t._count.appointments}</div>
                <div className="text-[10px] text-label">Randevu</div>
              </div>
            </div>

            {t.availabilities.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {t.availabilities.map((a) => (
                  <span key={a.id} className="text-[10px] px-2 py-0.5 rounded-full bg-neon/10 text-neon">
                    {DAYS[a.dayOfWeek]?.slice(0, 3)} {a.startTime}–{a.endTime}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5 pt-1 border-t border-subtle">
              <button onClick={() => openEdit(t)} className="flex-1 btn-secondary btn-sm gap-1.5">
                <Edit2 className="w-3.5 h-3.5" /> Düzenle
              </button>
              <button onClick={() => openAvail(t)} className="flex-1 btn-secondary btn-sm gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Müsaitlik
              </button>
              <button
                onClick={() => setDeleteTarget(t)}
                className="p-2 rounded-xl hover:bg-rose-500/10 text-muted hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {(modal === "create" || modal === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative w-full max-w-lg card-surface rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">{editing ? "Eğitmeni Düzenle" : "Yeni Eğitmen"}</h2>
              <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-subtle text-label"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-body mb-1.5">Ad Soyad *</label>
                  <input className="input w-full" placeholder="Elif Aydın" value={form.name} onChange={field("name")} required />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">E-posta {!editing && "*"}</label>
                  <input className="input w-full" type="email" placeholder="elif@..." value={form.email} onChange={field("email")} required={!editing} disabled={!!editing} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-body mb-1.5">Uzmanlık</label>
                <input className="input w-full" placeholder="Fonksiyonel Antrenman / HIIT" value={form.specialty} onChange={field("specialty")} />
              </div>
              <div>
                <label className="block text-xs text-body mb-1.5">Bio</label>
                <textarea className="input w-full h-20 resize-none" placeholder="Kısa tanıtım..." value={form.bio} onChange={field("bio")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-body mb-1.5">Deneyim (yıl)</label>
                  <input className="input w-full" type="number" min={0} value={form.experience} onChange={field("experience")} />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Puan (0–5)</label>
                  <input className="input w-full" type="number" step="0.1" min={0} max={5} value={form.rating} onChange={field("rating")} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-body mb-1.5">Fotoğraf</label>
                <ImageUploadInput
                  value={form.avatarUrl}
                  onChange={(url) => setForm((f) => ({ ...f, avatarUrl: url }))}
                  folder="trainers"
                  aspectClass="aspect-square"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)} className="btn-secondary btn-md flex-1">İptal</button>
                <button type="submit" disabled={saving} className="btn-primary btn-md flex-1">
                  {saving ? "Kaydediliyor…" : editing ? "Güncelle" : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Availability Modal */}
      {modal === "avail" && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative w-full max-w-md card-surface rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold">Müsaitlik Takvimi</h2>
                <p className="text-xs text-label mt-0.5">{editing.user.name}</p>
              </div>
              <button onClick={() => setModal(null)} className="p-1 rounded-lg hover:bg-subtle text-label"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              {DAYS.map((day, idx) => {
                const slot = availSlots.find((s) => s.dayOfWeek === idx);
                return (
                  <div key={idx} className={`rounded-xl border transition-colors ${slot ? "border-neon/30 bg-neon/5" : "border-subtle-md"}`}>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggleDay(idx)}
                        className={`w-5 h-5 rounded-md border-2 grid place-items-center flex-shrink-0 transition-colors ${slot ? "border-neon bg-neon" : "border-white/20"}`}
                      >
                        {slot && <span className="text-ink-950 text-xs font-bold">✓</span>}
                      </button>
                      <span className={`text-sm font-medium flex-1 ${slot ? "text-strong" : "text-muted"}`}>{day}</span>
                      {slot && (
                        <div className="flex items-center gap-2">
                          <select
                            value={slot.startTime}
                            onChange={(e) => updateSlotTime(idx, "startTime", e.target.value)}
                            className="text-xs bg-subtle border border-subtle-md rounded-lg px-2 py-1 text-strong"
                          >
                            {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <span className="text-faint text-xs">–</span>
                          <select
                            value={slot.endTime}
                            onChange={(e) => updateSlotTime(idx, "endTime", e.target.value)}
                            className="text-xs bg-subtle border border-subtle-md rounded-lg px-2 py-1 text-strong"
                          >
                            {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(null)} className="btn-secondary btn-md flex-1">İptal</button>
              <button onClick={saveAvailability} disabled={savingAvail} className="btn-primary btn-md flex-1">
                {savingAvail ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm card-surface rounded-2xl p-6">
            <h2 className="font-semibold mb-2">Eğitmeni Sil</h2>
            <p className="text-sm text-dim mb-5">
              <span className="text-strong font-medium">"{deleteTarget.user.name}"</span> kullanıcısını ve eğitmen profilini kalıcı olarak silmek istiyor musunuz?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary btn-md flex-1">İptal</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-medium text-sm transition-colors disabled:opacity-50">
                {deleting ? "Siliniyor…" : "Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
