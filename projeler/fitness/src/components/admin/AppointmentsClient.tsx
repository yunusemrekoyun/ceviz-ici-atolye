"use client";

import { useState, useEffect } from "react";
import { Plus, X, Calendar, ChevronDown, Trash2, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { formatDateTime, initials } from "@/lib/utils";
import { api } from "@/lib/api";

interface Member { id: string; memberNo: string; user: { name: string } }
interface Trainer { id: string; user: { name: string; avatarUrl: string | null }; specialty: string | null }
interface Appointment {
  id: string; startAt: string; endAt: string; status: string; notes: string | null;
  member: { id: string; user: { name: string } };
  trainer: { id: string; user: { name: string } };
}

interface Props {
  initialAppointments: Appointment[];
  members: Member[];
  trainers: Trainer[];
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Planlandı", COMPLETED: "Tamamlandı", CANCELLED: "İptal", NO_SHOW: "Gelmedi",
};
const STATUS_CLASS: Record<string, string> = {
  SCHEDULED: "bg-sky-500/10 text-sky-300",
  COMPLETED: "bg-emerald-500/10 text-emerald-300",
  CANCELLED: "bg-rose-500/10 text-rose-300",
  NO_SHOW: "bg-amber-500/10 text-amber-300",
};

export function AppointmentsClient({ initialAppointments, members, trainers }: Props) {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [filterTrainer, setFilterTrainer] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [loading, setLoading] = useState(false);

  // Create modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ memberId: "", trainerId: "", date: "", slot: "", duration: "60", notes: "" });
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsReason, setSlotsReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Status dropdown
  const [statusOpen, setStatusOpen] = useState<string | null>(null);

  function reload(trainer = filterTrainer, status = filterStatus, date = filterDate) {
    setLoading(true);
    const params = new URLSearchParams();
    if (trainer) params.set("trainerId", trainer);
    if (status) params.set("status", status);
    if (date) params.set("date", date);
    fetch(`/api/appointments?${params}`)
      .then((r) => r.json())
      .then((d) => { setAppointments(d); setLoading(false); })
      .catch(() => setLoading(false));
  }

  // Fetch slots when trainer+date changes
  useEffect(() => {
    if (!form.trainerId || !form.date) { setSlots([]); setSlotsReason(""); return; }
    setSlotsLoading(true);
    setForm((f) => ({ ...f, slot: "" }));
    fetch(`/api/appointments/slots?trainerId=${form.trainerId}&date=${form.date}&duration=${form.duration}`)
      .then((r) => r.json())
      .then((d) => { setSlots(d.slots || []); setSlotsReason(d.reason || ""); })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [form.trainerId, form.date, form.duration]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.memberId || !form.trainerId || !form.date || !form.slot) {
      return toast({ type: "error", message: "Tüm alanları doldurun." });
    }
    setSaving(true);
    try {
      const startAt = new Date(`${form.date}T${form.slot}:00`).toISOString();
      const apt = await api.post<Appointment>("/api/appointments", {
        memberId: form.memberId, trainerId: form.trainerId,
        startAt, durationMin: parseInt(form.duration), notes: form.notes || undefined,
      });
      setAppointments((prev) => [apt, ...prev].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()));
      toast({ type: "success", message: "Randevu oluşturuldu." });
      setModalOpen(false);
      setForm({ memberId: "", trainerId: "", date: "", slot: "", duration: "60", notes: "" });
    } catch (e: any) {
      toast({ type: "error", message: e.message || "Oluşturulamadı." });
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const updated = await api.patch<Appointment>(`/api/appointments/${id}`, { status });
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: updated.status } : a));
      toast({ type: "success", message: `Durum: ${STATUS_LABEL[status]}` });
    } catch {
      toast({ type: "error", message: "Güncellenemedi." });
    }
    setStatusOpen(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu randevuyu silmek istiyor musunuz?")) return;
    try {
      await api.del(`/api/appointments/${id}`);
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      toast({ type: "success", message: "Randevu silindi." });
    } catch {
      toast({ type: "error", message: "Silinemedi." });
    }
  }

  const displayed = appointments.filter((a) => {
    if (filterTrainer && a.trainer.id !== filterTrainer) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Randevular</h1>
          <p className="text-sm text-label mt-1">{displayed.length} randevu</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary btn-md">
          <Plus className="w-4 h-4" /> Yeni Randevu
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input type="date" value={filterDate} onChange={(e) => { setFilterDate(e.target.value); reload(filterTrainer, filterStatus, e.target.value); }} className="input" />
        <select value={filterTrainer} onChange={(e) => { setFilterTrainer(e.target.value); reload(e.target.value, filterStatus, filterDate); }} className="input">
          <option value="">Tüm eğitmenler</option>
          {trainers.map((t) => <option key={t.id} value={t.id}>{t.user.name}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); reload(filterTrainer, e.target.value, filterDate); }} className="input">
          <option value="">Tüm durumlar</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className={`card-surface overflow-x-auto transition-opacity ${loading ? "opacity-50" : ""}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-subtle">
              <th className="text-left px-4 py-3 text-muted font-medium">Tarih / Saat</th>
              <th className="text-left px-4 py-3 text-muted font-medium">Üye</th>
              <th className="text-left px-4 py-3 text-muted font-medium">Eğitmen</th>
              <th className="text-left px-4 py-3 text-muted font-medium">Süre</th>
              <th className="text-left px-4 py-3 text-muted font-medium">Durum</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 && (
              <tr><td colSpan={6} className="text-center py-16 text-faint">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Randevu bulunamadı
              </td></tr>
            )}
            {displayed.map((a) => {
              const durMin = Math.round((new Date(a.endAt).getTime() - new Date(a.startAt).getTime()) / 60000);
              return (
                <tr key={a.id} className="border-b border-subtle hover:bg-subtle">
                  <td className="px-4 py-3">
                    <div className="font-mono text-neon">{new Date(a.startAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</div>
                    <div className="text-xs text-muted">{new Date(a.startAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">{a.member.user.name}</td>
                  <td className="px-4 py-3 text-dim">{a.trainer.user.name}</td>
                  <td className="px-4 py-3 text-label"><Clock className="w-3.5 h-3.5 inline mr-1" />{durMin} dk</td>
                  <td className="px-4 py-3 relative">
                    <button
                      onClick={() => setStatusOpen(statusOpen === a.id ? null : a.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CLASS[a.status] ?? ""}`}
                    >
                      {STATUS_LABEL[a.status] ?? a.status}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {statusOpen === a.id && (
                      <div className="absolute z-20 left-4 mt-1 w-36 card-surface rounded-xl shadow-xl border border-subtle-md overflow-hidden">
                        {Object.entries(STATUS_LABEL).map(([k, v]) => (
                          <button key={k} onClick={() => updateStatus(a.id, k)}
                            className={`w-full text-left px-3 py-2 text-xs hover:bg-subtle flex items-center gap-2 ${a.status === k ? "text-neon" : "text-dim"}`}
                          >
                            {k === "COMPLETED" && <CheckCircle2 className="w-3 h-3" />}
                            {k === "CANCELLED" && <XCircle className="w-3 h-3" />}
                            {k === "NO_SHOW" && <AlertCircle className="w-3 h-3" />}
                            {k === "SCHEDULED" && <Clock className="w-3 h-3" />}
                            {v}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(a.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted hover:text-rose-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setStatusOpen(null)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg card-surface rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Yeni Randevu</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg hover:bg-subtle text-label"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs text-body mb-1.5">Üye *</label>
                <select className="input w-full" value={form.memberId} onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))} required>
                  <option value="">Üye seç...</option>
                  {members.map((m) => <option key={m.id} value={m.id}>{m.user.name} — {m.memberNo}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-body mb-1.5">Eğitmen *</label>
                  <select className="input w-full" value={form.trainerId} onChange={(e) => setForm((f) => ({ ...f, trainerId: e.target.value, slot: "" }))} required>
                    <option value="">Eğitmen seç...</option>
                    {trainers.map((t) => <option key={t.id} value={t.id}>{t.user.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Süre</label>
                  <select className="input w-full" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value, slot: "" }))}>
                    <option value="30">30 dk</option>
                    <option value="45">45 dk</option>
                    <option value="60">60 dk</option>
                    <option value="90">90 dk</option>
                    <option value="120">120 dk</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-body mb-1.5">Tarih *</label>
                <input type="date" className="input w-full" value={form.date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value, slot: "" }))} required />
              </div>

              {/* Slots */}
              {(form.trainerId && form.date) && (
                <div>
                  <label className="block text-xs text-body mb-1.5">Saat Seç *</label>
                  {slotsLoading && <div className="text-xs text-muted py-2">Yükleniyor...</div>}
                  {!slotsLoading && slots.length === 0 && (
                    <div className="text-xs text-amber-300 py-2">{slotsReason || "Bu günde müsait saat yok"}</div>
                  )}
                  {!slotsLoading && slots.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {slots.map((s) => (
                        <button key={s} type="button"
                          onClick={() => setForm((f) => ({ ...f, slot: s }))}
                          className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-colors ${form.slot === s ? "bg-neon text-ink-950 font-semibold" : "bg-subtle hover:bg-subtle-md text-dim"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs text-body mb-1.5">Notlar</label>
                <textarea className="input w-full h-16 resize-none" placeholder="Opsiyonel not..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary btn-md flex-1">İptal</button>
                <button type="submit" disabled={saving || !form.slot} className="btn-primary btn-md flex-1">
                  {saving ? "Kaydediliyor…" : "Randevu Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
