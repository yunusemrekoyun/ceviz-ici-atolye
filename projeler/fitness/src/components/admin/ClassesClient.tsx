"use client";

import { useState } from "react";
import {
  Users, Plus, Edit2, Trash2, Loader2,
  ChevronLeft, ChevronRight, X, Check, MapPin, Eye, EyeOff,
  UserCheck, QrCode, Clock,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { formatDate } from "@/lib/utils";

interface ClassItem {
  id: string;
  title: string;
  description: string | null;
  trainerId: string | null;
  trainerName: string | null;
  branchId: string | null;
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

interface Props {
  initialClasses: ClassItem[];
  trainers: { id: string; name: string }[];
  branches: { id: string; name: string }[];
}

const EMPTY_FORM = {
  title: "",
  description: "",
  trainerId: "",
  branchId: "",
  location: "",
  capacity: 20,
  color: "#C6FF3D",
  startAt: "",
  endAt: "",
  isPublished: false,
  repeat: false,
  repeatWeeks: 4,
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Planlandı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}
function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

const DAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

interface Booking {
  id: string;
  status: string;
  bookedAt: string;
  usedAt: string | null;
  ticketCode: string;
  member: { id: string; memberNo: string; user: { name: string } };
}

export function ClassesClient({ initialClasses, trainers, branches }: Props) {
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassItem[]>(initialClasses);
  const [modal, setModal]     = useState<"create" | "edit" | null>(null);
  const [editItem, setEditItem] = useState<ClassItem | null>(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode]     = useState<"week" | "list">("week");
  const [attendeesFor, setAttendeesFor] = useState<{ classId: string; title: string; bookings: Booking[] } | null>(null);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7) + weekOffset * 7);
  weekStart.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditItem(null);
    setModal("create");
  }

  function openEdit(c: ClassItem) {
    setEditItem(c);
    setForm({
      title: c.title,
      description: c.description ?? "",
      trainerId: c.trainerId ?? "",
      branchId: c.branchId ?? "",
      location: c.location ?? "",
      capacity: c.capacity,
      color: c.color,
      startAt: c.startAt.slice(0, 16),
      endAt: c.endAt.slice(0, 16),
      isPublished: c.isPublished,
      repeat: false,
      repeatWeeks: 4,
    });
    setModal("edit");
  }

  async function openAttendees(c: ClassItem) {
    setLoadingAttendees(true);
    try {
      const res = await fetch(`/api/classes/${c.id}`);
      const data = await res.json();
      setAttendeesFor({ classId: c.id, title: c.title, bookings: data.bookings ?? [] });
    } catch {
      toast({ type: "error", message: "Kayıtlar yüklenemedi" });
    } finally {
      setLoadingAttendees(false);
    }
  }

  async function promoteBooking(classId: string, bookingId: string) {
    setPromotingId(bookingId);
    try {
      const res = await fetch(`/api/classes/${classId}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Onaylanamadı");
      }
      setAttendeesFor((prev) =>
        prev ? { ...prev, bookings: prev.bookings.map((b) => (b.id === bookingId ? { ...b, status: "CONFIRMED" } : b)) } : prev
      );
      setClasses((prev) => prev.map((c) => (c.id === classId ? { ...c, confirmedCount: c.confirmedCount + 1 } : c)));
      toast({ type: "success", message: "Üye onaylandı ve bilgilendirildi." });
    } catch (e: any) {
      toast({ type: "error", message: e.message || "İşlem başarısız." });
    } finally {
      setPromotingId(null);
    }
  }

  async function handleSave() {
    if (!form.title || !form.startAt || !form.endAt) {
      toast({ type: "error", message: "Başlık, başlangıç ve bitiş zorunlu" });
      return;
    }
    const startMs = new Date(form.startAt).getTime();
    const endMs   = new Date(form.endAt).getTime();
    if (endMs <= startMs) {
      toast({ type: "error", message: "Bitiş zamanı başlangıçtan sonra olmalı" });
      return;
    }
    const durationMin = Math.round((endMs - startMs) / 60000);
    const { repeat, repeatWeeks, ...formBase } = form;
    setSaving(true);
    try {
      const payload = {
        ...formBase,
        durationMin,
        trainerId: form.trainerId || null,
        branchId: form.branchId || null,
        location: form.location || null,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
      };

      // Yeni + tekrarlı ders → toplu oluşturma
      if (modal === "create" && repeat) {
        const res = await fetch("/api/classes/recurring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, weeks: repeatWeeks }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const added = (data.classes ?? []).map((cl: any) => ({
          ...cl,
          confirmedCount: 0,
          trainerName: cl.trainer?.user?.name ?? null,
        }));
        setClasses((prev) => [...prev, ...added]);
        toast({ type: "success", message: `${data.count} haftalık ders oluşturuldu` });
        setModal(null);
        return;
      }

      const url    = modal === "edit" && editItem ? `/api/classes/${editItem.id}` : "/api/classes";
      const method = modal === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const trainerName = trainers.find((t) => t.id === data.trainerId)?.name ?? null;
      if (modal === "edit") {
        setClasses((prev) => prev.map((c) => c.id === editItem!.id
          ? { ...c, ...data, startAt: data.startAt, endAt: data.endAt, trainerName, confirmedCount: c.confirmedCount }
          : c));
        toast({ type: "success", message: "Ders güncellendi" });
      } else {
        setClasses((prev) => [...prev, { ...data, confirmedCount: 0, trainerName }]);
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
    const res = await fetch(`/api/classes/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !c.isPublished }),
    });
    if (res.ok) {
      setClasses((prev) => prev.map((x) => x.id === c.id ? { ...x, isPublished: !c.isPublished } : x));
      toast({ type: "success", message: c.isPublished ? "Ders gizlendi" : "Ders yayınlandı" });
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Bu dersi iptal etmek istediğine emin misin?")) return;
    const res = await fetch(`/api/classes/${id}`, { method: "DELETE" });
    if (res.ok) {
      setClasses((prev) => prev.map((c) => c.id === id ? { ...c, status: "CANCELLED" } : c));
      toast({ type: "success", message: "Ders iptal edildi" });
    }
  }

  const classesInWeek = classes.filter((c) => {
    const d = new Date(c.startAt);
    return d >= days[0] && d <= new Date(days[6].getTime() + 86400000);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-sm text-body">Salon Yönetimi</div>
          <h1 className="text-2xl font-bold mt-0.5">Grup Dersler</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl overflow-hidden border border-subtle-md">
            {(["week", "list"] as const).map((v) => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-3 py-2 text-sm transition-colors ${viewMode === v ? "bg-neon text-ink-950 font-medium" : "text-body hover:bg-subtle"}`}>
                {v === "week" ? "Haftalık" : "Liste"}
              </button>
            ))}
          </div>
          <button onClick={openCreate} className="btn-primary btn-sm"><Plus className="w-4 h-4" /> Yeni Ders</button>
        </div>
      </div>

      {/* Haftalık grid */}
      {viewMode === "week" && (
        <div className="card-surface overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-subtle">
            <button onClick={() => setWeekOffset((w) => w - 1)} className="btn-ghost btn-sm"><ChevronLeft className="w-4 h-4" /></button>
            <div className="text-sm font-medium">
              {days[0].toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} —{" "}
              {days[6].toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </div>
            <button onClick={() => setWeekOffset((w) => w + 1)} className="btn-ghost btn-sm"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 divide-x divide-white/5">
            {days.map((day, i) => {
              const isToday = day.toDateString() === now.toDateString();
              const dayClasses = classesInWeek.filter((c) => new Date(c.startAt).toDateString() === day.toDateString());
              return (
                <div key={i} className="min-h-[120px] p-2">
                  <div className={`text-xs font-medium mb-2 text-center px-1 py-0.5 rounded-lg ${isToday ? "bg-neon text-ink-950" : "text-label"}`}>
                    {DAYS[i]} <span>{day.getDate()}</span>
                  </div>
                  <div className="space-y-1">
                    {dayClasses.map((c) => (
                      <div key={c.id} onClick={() => openEdit(c)}
                        className={`rounded-lg p-1.5 cursor-pointer text-xs transition-opacity ${c.status === "CANCELLED" ? "opacity-40" : "hover:opacity-80"}`}
                        style={{ backgroundColor: `${c.color}20`, borderLeft: `2px solid ${c.color}` }}>
                        <div className="font-medium truncate">{c.title}</div>
                        <div className="text-label">{formatTime(c.startAt)}</div>
                        <div className="flex items-center gap-1 text-muted">
                          <Users className="w-2.5 h-2.5" />{c.confirmedCount}/{c.capacity}
                          {!c.isPublished && <EyeOff className="w-2.5 h-2.5 ml-1 text-amber-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Liste */}
      {viewMode === "list" && (
        <div className="card-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-subtle">
              <tr className="text-xs uppercase text-muted">
                <th className="text-left px-5 py-3">Ders</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">Antrenör</th>
                <th className="text-left px-5 py-3">Tarih & Saat</th>
                <th className="text-center px-5 py-3">Doluluk</th>
                <th className="text-center px-5 py-3">Durum</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {classes.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-faint">Henüz ders yok</td></tr>
              )}
              {classes.map((c) => (
                <tr key={c.id} className="hover:bg-subtle">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <div>
                        <div className="font-medium flex items-center gap-1.5">
                          {c.title}
                          {!c.isPublished && <EyeOff className="w-3 h-3 text-amber-400" />}
                        </div>
                        {c.location && <div className="text-xs text-muted flex items-center gap-1"><MapPin className="w-2.5 h-2.5" />{c.location}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-body hidden md:table-cell">{c.trainerName ?? "—"}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium">{formatDateShort(c.startAt)}</div>
                    <div className="text-xs text-muted">{formatTime(c.startAt)} · {c.durationMin} dk</div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-sm font-medium ${c.confirmedCount >= c.capacity ? "text-rose-400" : "text-neon"}`}>
                      {c.confirmedCount}/{c.capacity}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`badge ${c.status === "SCHEDULED" ? "badge-warn" : c.status === "COMPLETED" ? "badge-success" : "badge-danger"}`}>
                      {STATUS_LABELS[c.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openAttendees(c)} title="Kayıtlı üyeler" className="btn-ghost btn-sm p-1.5">
                        <UserCheck className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleTogglePublish(c)} title={c.isPublished ? "Gizle" : "Yayınla"} className="btn-ghost btn-sm p-1.5">
                        {c.isPublished ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-neon" />}
                      </button>
                      <button onClick={() => openEdit(c)} className="btn-ghost btn-sm p-1.5"><Edit2 className="w-3.5 h-3.5" /></button>
                      {c.status === "SCHEDULED" && (
                        <button onClick={() => handleCancel(c.id)} className="btn-ghost btn-sm p-1.5 text-rose-400 hover:text-rose-300">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Kayıtlı Üyeler Modal */}
      {attendeesFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAttendeesFor(null)} />
          <div className="relative z-10 w-full max-w-lg card-surface p-6 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-lg">{attendeesFor.title}</h2>
                <div className="text-sm text-muted">
                  {attendeesFor.bookings.filter(b => b.status === "CONFIRMED").length} onaylı
                  {attendeesFor.bookings.some(b => b.status === "WAITLIST") &&
                    ` · ${attendeesFor.bookings.filter(b => b.status === "WAITLIST").length} bekleme listesi`}
                </div>
              </div>
              <button onClick={() => setAttendeesFor(null)} className="btn-ghost btn-sm p-1.5"><X className="w-4 h-4" /></button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2">
              {attendeesFor.bookings.length === 0 && (
                <div className="text-center py-8 text-muted text-sm">Henüz kayıt yok</div>
              )}
              {[...attendeesFor.bookings]
                .sort((a, b) => {
                  const rank = (s: string) => (s === "CONFIRMED" ? 0 : s === "WAITLIST" ? 1 : 2);
                  return rank(a.status) - rank(b.status) || a.bookedAt.localeCompare(b.bookedAt);
                })
                .map((b) => (
                <div key={b.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${b.status === "CANCELLED" ? "border-rose-500/20 opacity-50" : b.status === "WAITLIST" ? "border-amber-500/20 bg-amber-500/5" : b.usedAt ? "border-emerald-500/20 bg-emerald-500/5" : "border-subtle-md"}`}>
                  <div className="w-8 h-8 rounded-lg bg-neon/10 grid place-items-center shrink-0">
                    {b.status === "WAITLIST" ? <Clock className="w-4 h-4 text-amber-400" /> : b.usedAt ? <Check className="w-4 h-4 text-emerald-400" /> : <QrCode className="w-4 h-4 text-neon" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{b.member.user.name}</div>
                    <div className="text-xs text-muted">No: {b.member.memberNo}</div>
                  </div>
                  <div className="text-xs text-right shrink-0 flex items-center gap-2">
                    {b.usedAt
                      ? <span className="text-emerald-400">Katıldı · {new Date(b.usedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
                      : b.status === "CANCELLED"
                        ? <span className="text-rose-400">İptal</span>
                        : b.status === "WAITLIST"
                          ? <>
                              <span className="text-amber-400">Bekliyor</span>
                              <button
                                onClick={() => promoteBooking(attendeesFor.classId, b.id)}
                                disabled={promotingId === b.id}
                                className="btn-primary btn-sm py-1"
                              >
                                {promotingId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Onayla"}
                              </button>
                            </>
                          : <span className="text-muted">Onaylı</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative z-10 w-full max-w-lg card-surface p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg">{modal === "create" ? "Yeni Ders" : "Ders Düzenle"}</h2>
              <button onClick={() => setModal(null)} className="btn-ghost btn-sm p-1.5"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label-base">Başlık *</label>
                <input className="input-base" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Yoga, Spinning..." />
              </div>
              <div>
                <label className="label-base">Açıklama</label>
                <input className="input-base" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Kısa açıklama" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-base">Antrenör</label>
                  <select className="input-base" value={form.trainerId} onChange={(e) => setForm((f) => ({ ...f, trainerId: e.target.value }))}>
                    <option value="">Seçiniz</option>
                    {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-base">Şube</label>
                  <select className="input-base" value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}>
                    <option value="">Seçiniz</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label-base">Konum / Salon</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input className="input-base pl-9" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Spin Salonu, 2. Kat..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-base">Başlangıç *</label>
                  <input type="datetime-local" className="input-base" value={form.startAt} onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))} />
                </div>
                <div>
                  <label className="label-base">Bitiş *</label>
                  <input type="datetime-local" className="input-base" value={form.endAt} onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))} />
                </div>
              </div>
              {form.startAt && form.endAt && new Date(form.endAt) > new Date(form.startAt) && (
                <div className="text-xs text-neon flex items-center gap-1.5 -mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  Süre: {Math.round((new Date(form.endAt).getTime() - new Date(form.startAt).getTime()) / 60000)} dakika
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-base">Kapasite</label>
                  <input type="number" min={1} max={200} className="input-base" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="label-base">Renk</label>
                  <div className="flex items-center gap-2">
                    <input type="color" className="h-11 w-12 rounded-xl border border-subtle-md bg-ink-800 cursor-pointer p-1" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
                    <input className="input-base flex-1 font-mono text-sm" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
                  </div>
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div className={`relative w-10 h-6 rounded-full transition-colors ${form.isPublished ? "bg-neon" : "bg-subtle-md"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isPublished ? "translate-x-5" : "translate-x-1"}`} />
                  <input type="checkbox" className="sr-only" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} />
                </div>
                <span className="text-sm font-medium">Üyelerin panelinde yayınla</span>
              </label>

              {modal === "create" && (
                <div className="rounded-xl border border-subtle-md p-3 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div className={`relative w-10 h-6 rounded-full transition-colors ${form.repeat ? "bg-neon" : "bg-subtle-md"}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.repeat ? "translate-x-5" : "translate-x-1"}`} />
                      <input type="checkbox" className="sr-only" checked={form.repeat} onChange={(e) => setForm((f) => ({ ...f, repeat: e.target.checked }))} />
                    </div>
                    <span className="text-sm font-medium">Her hafta tekrarla</span>
                  </label>
                  {form.repeat && (
                    <div className="flex items-center gap-2 text-sm pl-1">
                      <span className="text-muted">Kaç hafta boyunca:</span>
                      <input
                        type="number"
                        min={2}
                        max={52}
                        className="input-base w-20"
                        value={form.repeatWeeks}
                        onChange={(e) => setForm((f) => ({ ...f, repeatWeeks: Math.max(2, Math.min(52, Number(e.target.value) || 2)) }))}
                      />
                      <span className="text-muted">hafta</span>
                    </div>
                  )}
                  {form.repeat && form.startAt && (
                    <p className="text-xs text-neon flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Aynı gün ve saatte {form.repeatWeeks} ayrı ders oluşturulacak.
                    </p>
                  )}
                </div>
              )}
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
