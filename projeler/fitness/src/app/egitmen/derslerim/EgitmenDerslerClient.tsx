"use client";

import { useState } from "react";
import {
  Plus, X, Check, Loader2, Edit2, Trash2, Eye, EyeOff,
  Users, MapPin, Clock, UserCheck, QrCode, CalendarDays,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { initials } from "@/lib/utils";

interface ClassItem {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  capacity: number;
  durationMin: number;
  color: string;
  startAt: string;
  endAt: string;
  status: string;
  isPublished: boolean;
  confirmedCount: number;
}

interface Booking {
  id: string;
  status: string;
  usedAt: string | null;
  bookedAt: string;
  member: { id: string; memberNo: string; user: { name: string; avatarUrl: string | null } };
}

const EMPTY_FORM = {
  title: "", description: "", location: "",
  capacity: 20, color: "#C6FF3D",
  startAt: "", endAt: "", isPublished: false,
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function EgitmenDerslerClient({ initialClasses }: { initialClasses: ClassItem[] }) {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassItem[]>(initialClasses);
  const [modal, setModal]     = useState<"create" | "edit" | null>(null);
  const [editId, setEditId]   = useState<string | null>(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [attendees, setAttendees] = useState<{ title: string; bookings: Booking[] } | null>(null);

  function f(key: keyof typeof EMPTY_FORM) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));
  }

  function openCreate() { setForm(EMPTY_FORM); setEditId(null); setModal("create"); }

  function openEdit(c: ClassItem) {
    setEditId(c.id);
    setForm({ title: c.title, description: c.description ?? "", location: c.location ?? "",
      capacity: c.capacity, color: c.color,
      startAt: c.startAt.slice(0, 16), endAt: c.endAt.slice(0, 16), isPublished: c.isPublished });
    setModal("edit");
  }

  async function openAttendees(c: ClassItem) {
    try {
      const res  = await fetch(`/api/trainer/classes/${c.id}`);
      const data = await res.json();
      setAttendees({ title: c.title, bookings: data.bookings ?? [] });
    } catch {
      toast({ type: "error", message: "Kayıtlar yüklenemedi" });
    }
  }

  async function handleSave() {
    if (!form.title || !form.startAt || !form.endAt) {
      toast({ type: "error", message: "Başlık, başlangıç ve bitiş zorunlu" }); return;
    }
    const startMs   = new Date(form.startAt).getTime();
    const endMs     = new Date(form.endAt).getTime();
    if (endMs <= startMs) {
      toast({ type: "error", message: "Bitiş zamanı başlangıçtan sonra olmalı" }); return;
    }
    const durationMin = Math.round((endMs - startMs) / 60000);
    setSaving(true);
    try {
      const payload = { ...form, durationMin, location: form.location || null, description: form.description || null,
        startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt).toISOString() };
      const url    = editId ? `/api/trainer/classes/${editId}` : "/api/trainer/classes";
      const method = editId ? "PATCH" : "POST";
      const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (editId) {
        setClasses((p) => p.map((c) => c.id === editId ? { ...c, ...data, confirmedCount: c.confirmedCount } : c));
        toast({ type: "success", message: "Ders güncellendi" });
      } else {
        setClasses((p) => [...p, { ...data, confirmedCount: 0 }]);
        toast({ type: "success", message: "Ders oluşturuldu" });
      }
      setModal(null);
    } catch (e: unknown) {
      toast({ type: "error", message: e instanceof Error ? e.message : "Hata" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePublish(c: ClassItem) {
    const res = await fetch(`/api/trainer/classes/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !c.isPublished }),
    });
    if (res.ok) {
      setClasses((p) => p.map((x) => x.id === c.id ? { ...x, isPublished: !c.isPublished } : x));
      toast({ type: "success", message: c.isPublished ? "Gizlendi" : "Yayınlandı" });
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Bu dersi iptal etmek istediğine emin misin?")) return;
    const res = await fetch(`/api/trainer/classes/${id}`, { method: "DELETE" });
    if (res.ok) {
      setClasses((p) => p.filter((c) => c.id !== id));
      toast({ type: "success", message: "Ders iptal edildi" });
    }
  }

  const upcoming = classes.filter((c) => new Date(c.startAt) >= new Date());
  const past     = classes.filter((c) => new Date(c.startAt) <  new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Derslerim</h1>
          <p className="text-sm text-muted mt-0.5">Oluşturduğun grup dersler</p>
        </div>
        <button onClick={openCreate} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Yeni Ders</button>
      </div>

      {classes.length === 0 && (
        <div className="card-surface p-12 text-center text-muted">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Henüz ders oluşturmadın.</p>
          <button onClick={openCreate} className="mt-4 btn-primary btn-sm">Hemen Oluştur</button>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Yaklaşan</div>
          {upcoming.map((c) => <ClassCard key={c.id} c={c} onEdit={openEdit} onToggle={handleTogglePublish} onCancel={handleCancel} onAttendees={openAttendees} />)}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted uppercase tracking-wider">Geçmiş</div>
          {past.map((c) => <ClassCard key={c.id} c={c} onEdit={openEdit} onToggle={handleTogglePublish} onCancel={handleCancel} onAttendees={openAttendees} />)}
        </div>
      )}

      {/* Kayıtlı üyeler */}
      {attendees && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAttendees(null)} />
          <div className="relative z-10 w-full max-w-md card-surface p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold">{attendees.title}</h2>
                <p className="text-sm text-muted">{attendees.bookings.filter(b => b.status !== "CANCELLED").length} kayıtlı</p>
              </div>
              <button onClick={() => setAttendees(null)} className="btn-ghost btn-sm p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 overflow-y-auto flex-1">
              {attendees.bookings.length === 0 && <p className="text-center text-muted text-sm py-6">Henüz kayıt yok</p>}
              {attendees.bookings.map((b) => (
                <div key={b.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${b.status === "CANCELLED" ? "opacity-40 border-rose-500/20" : b.usedAt ? "border-emerald-500/20 bg-emerald-500/5" : "border-subtle-md"}`}>
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                    {b.member.user.avatarUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={b.member.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-neon/10 grid place-items-center text-xs font-bold text-neon">{initials(b.member.user.name)}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{b.member.user.name}</div>
                    <div className="text-xs text-muted">No: {b.member.memberNo}</div>
                  </div>
                  <div className="text-xs shrink-0">
                    {b.usedAt
                      ? <span className="text-emerald-400">Katıldı</span>
                      : b.status === "CANCELLED"
                        ? <span className="text-rose-400">İptal</span>
                        : <QrCode className="w-3.5 h-3.5 text-muted" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative z-10 w-full max-w-lg card-surface p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">{editId ? "Ders Düzenle" : "Yeni Ders"}</h2>
              <button onClick={() => setModal(null)} className="btn-ghost btn-sm p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-base">Başlık *</label>
                <input className="input-base" value={form.title} onChange={f("title")} placeholder="Yoga, Spinning..." />
              </div>
              <div>
                <label className="label-base">Açıklama</label>
                <input className="input-base" value={form.description} onChange={f("description")} placeholder="Kısa açıklama" />
              </div>
              <div>
                <label className="label-base">Konum</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input className="input-base pl-9" value={form.location} onChange={f("location")} placeholder="Spin Salonu, 2. Kat..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-base">Başlangıç *</label>
                  <input type="datetime-local" className="input-base" value={form.startAt} onChange={f("startAt")} />
                </div>
                <div>
                  <label className="label-base">Bitiş *</label>
                  <input type="datetime-local" className="input-base" value={form.endAt} onChange={f("endAt")} />
                </div>
              </div>
              {form.startAt && form.endAt && new Date(form.endAt) > new Date(form.startAt) && (
                <div className="text-xs text-neon flex items-center gap-1.5 -mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  Süre: {Math.round((new Date(form.endAt).getTime() - new Date(form.startAt).getTime()) / 60000)} dakika
                </div>
              )}
              <div>
                <label className="label-base">Kapasite</label>
                <input type="number" min={1} max={200} className="input-base" value={form.capacity}
                  onChange={(e) => setForm((p) => ({ ...p, capacity: Number(e.target.value) }))} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className={`relative w-10 h-6 rounded-full transition-colors ${form.isPublished ? "bg-neon" : "bg-subtle-md"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isPublished ? "translate-x-5" : "translate-x-1"}`} />
                  <input type="checkbox" className="sr-only" checked={form.isPublished}
                    onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))} />
                </div>
                <span className="text-sm font-medium">Üyelerin panelinde yayınla</span>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="btn-secondary btn-md flex-1">İptal</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary btn-md flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Kaydet</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClassCard({ c, onEdit, onToggle, onCancel, onAttendees }: {
  c: ClassItem;
  onEdit: (c: ClassItem) => void;
  onToggle: (c: ClassItem) => void;
  onCancel: (id: string) => void;
  onAttendees: (c: ClassItem) => void;
}) {
  const full = c.confirmedCount >= c.capacity;
  return (
    <div className={`card-surface p-4 flex items-start gap-4 ${c.status === "CANCELLED" ? "opacity-50" : ""}`}
      style={{ borderLeft: `3px solid ${c.color}` }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{c.title}</span>
          {!c.isPublished && <span className="badge badge-warn text-xs">Taslak</span>}
          {c.status === "CANCELLED" && <span className="badge badge-danger text-xs">İptal</span>}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(c.startAt).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {c.durationMin} dk</span>
          {c.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.location}</span>}
          <span className={`flex items-center gap-1 ${full ? "text-rose-400" : "text-neon"}`}><Users className="w-3 h-3" />{c.confirmedCount}/{c.capacity}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onAttendees(c)} title="Kayıtlı üyeler" className="btn-ghost btn-sm p-1.5"><UserCheck className="w-4 h-4" /></button>
        <button onClick={() => onToggle(c)} title={c.isPublished ? "Gizle" : "Yayınla"} className="btn-ghost btn-sm p-1.5">
          {c.isPublished ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4 text-neon" />}
        </button>
        <button onClick={() => onEdit(c)} className="btn-ghost btn-sm p-1.5"><Edit2 className="w-4 h-4" /></button>
        {c.status !== "CANCELLED" && (
          <button onClick={() => onCancel(c.id)} className="btn-ghost btn-sm p-1.5 text-rose-400"><Trash2 className="w-4 h-4" /></button>
        )}
      </div>
    </div>
  );
}
