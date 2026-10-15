"use client";

import { useState } from "react";
import {
  Calendar, CalendarPlus, Clock, Users, Check, Loader2, AlertCircle,
  BookOpen, MapPin, QrCode, Download, X,
} from "lucide-react";

interface MyBooking { id: string; status: string; ticketCode: string }

interface ClassItem {
  id: string;
  title: string;
  description: string | null;
  trainerName: string | null;
  location: string | null;
  capacity: number;
  durationMin: number;
  color: string;
  startAt: string;
  confirmedCount: number;
  myBooking: MyBooking | null;
}

interface Props {
  classes: ClassItem[];
  hasMembership: boolean;
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

export function ClassScheduleClient({ classes, hasMembership }: Props) {
  const [bookings, setBookings]   = useState<Record<string, MyBooking | null>>(
    Object.fromEntries(classes.map((c) => [c.id, c.myBooking]))
  );
  const [counts, setCounts]       = useState<Record<string, number>>(
    Object.fromEntries(classes.map((c) => [c.id, c.confirmedCount]))
  );
  const [loading, setLoading]     = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [ticketClass, setTicketClass] = useState<ClassItem | null>(null);

  async function handleBook(classId: string) {
    setLoading(classId); setError(null);
    try {
      const res  = await fetch(`/api/panel/classes/${classId}/book`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBookings((s) => ({ ...s, [classId]: data.booking }));
      // Bekleme listesi kaydı kontenjanı doldurmaz
      if (!data.waitlisted) setCounts((c) => ({ ...c, [classId]: (c[classId] ?? 0) + 1 }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(null);
    }
  }

  async function handleCancel(classId: string) {
    setLoading(classId); setError(null);
    const wasConfirmed = bookings[classId]?.status === "CONFIRMED";
    try {
      const res = await fetch(`/api/panel/classes/${classId}/cancel`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      setBookings((s) => ({ ...s, [classId]: null }));
      // Sadece onaylı bir yer boşalttıysak kontenjan sayısını düş
      if (wasConfirmed) setCounts((c) => ({ ...c, [classId]: Math.max(0, (c[classId] ?? 1) - 1) }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Hata");
    } finally {
      setLoading(null);
    }
  }

  if (classes.length === 0) {
    return (
      <div className="card-surface p-12 text-center">
        <BookOpen className="w-10 h-10 text-neon/30 mx-auto" />
        <div className="mt-4 text-label">Yaklaşan ders bulunmuyor.</div>
      </div>
    );
  }

  const grouped = new Map<string, ClassItem[]>();
  for (const c of classes) {
    const day = new Date(c.startAt).toDateString();
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(c);
  }

  return (
    <>
      <div className="space-y-6">
        {error && (
          <div className="card-surface p-3 border-rose-500/20 bg-rose-500/5 text-sm text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}
        {!hasMembership && (
          <div className="card-surface p-4 border-amber-500/20 bg-amber-500/5 text-sm text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />Derse kayıt olmak için aktif üyelik gerekli.
          </div>
        )}

        {Array.from(grouped.entries()).map(([day, dayClasses]) => (
          <div key={day}>
            <div className="text-sm font-semibold text-dim mb-3 capitalize">{formatDay(dayClasses[0].startAt)}</div>
            <div className="space-y-3">
              {dayClasses.map((c) => {
                const myBooking  = bookings[c.id];
                const myStatus   = myBooking?.status ?? null;
                const count      = counts[c.id] ?? c.confirmedCount;
                const isFull     = count >= c.capacity;
                const isLoading  = loading === c.id;
                const isConfirmed = myStatus === "CONFIRMED";
                const isWaitlisted = myStatus === "WAITLIST";
                const hasBooking = isConfirmed || isWaitlisted;

                return (
                  <div key={c.id} className="card-surface p-5 flex items-start gap-4 flex-wrap" style={{ borderLeft: `3px solid ${c.color}` }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{c.title}</span>
                        {isConfirmed && <span className="badge badge-success"><Check className="w-3 h-3" />Kayıtlısın</span>}
                        {isWaitlisted && <span className="badge badge-warn"><Clock className="w-3 h-3" />Bekleme listesinde</span>}
                        {isFull && !myStatus && <span className="badge badge-danger">Dolu</span>}
                      </div>
                      {c.description && <div className="text-xs text-muted mt-0.5">{c.description}</div>}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(c.startAt)} · {c.durationMin} dk</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{count}/{c.capacity}</span>
                        {c.trainerName && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{c.trainerName}</span>}
                        {c.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.location}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isConfirmed && myBooking && (
                        <>
                          <a
                            href={`/api/panel/ics?class=${c.id}`}
                            title="Takvime Ekle"
                            className="p-2 rounded-lg text-muted hover:text-neon hover:bg-subtle transition-colors"
                          >
                            <CalendarPlus className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => setTicketClass(c)}
                            className="btn-secondary btn-sm flex items-center gap-1.5"
                          >
                            <QrCode className="w-3.5 h-3.5" /> Bilet
                          </button>
                        </>
                      )}
                      {hasMembership && (
                        hasBooking ? (
                          <button onClick={() => handleCancel(c.id)} disabled={isLoading}
                            className="btn-secondary btn-sm text-rose-300 hover:text-rose-200">
                            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isWaitlisted ? "Listeden Çık" : "İptal"}
                          </button>
                        ) : (
                          <button onClick={() => handleBook(c.id)} disabled={isLoading}
                            className="btn-primary btn-sm">
                            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isFull ? "Bekleme Listesine Katıl" : "Kayıt Ol"}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bilet QR Modal */}
      {ticketClass && (() => {
        const myBooking = bookings[ticketClass.id];
        if (!myBooking) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setTicketClass(null)} />
            <div className="relative z-10 w-full max-w-sm bg-[var(--bg-card)] rounded-3xl border border-subtle-md shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-subtle">
                <div>
                  <div className="text-xs text-neon font-semibold tracking-wider uppercase">Ders Bileti</div>
                  <div className="font-bold">{ticketClass.title}</div>
                </div>
                <button onClick={() => setTicketClass(null)} className="btn-ghost btn-sm p-1.5"><X className="w-4 h-4" /></button>
              </div>

              {/* QR */}
              <div className="p-6 flex flex-col items-center gap-4">
                <div className="w-52 h-52 bg-white rounded-2xl p-2 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/qr/${encodeURIComponent(myBooking.ticketCode)}`}
                    alt="Bilet QR"
                    className="w-full h-full"
                  />
                </div>

                <div className="text-center space-y-1">
                  <div className="text-sm text-muted flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(ticketClass.startAt).toLocaleString("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                    {" · "}{ticketClass.durationMin} dk
                  </div>
                  {ticketClass.location && (
                    <div className="text-sm text-muted flex items-center justify-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />{ticketClass.location}
                    </div>
                  )}
                  {ticketClass.trainerName && (
                    <div className="text-sm text-muted flex items-center justify-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />{ticketClass.trainerName}
                    </div>
                  )}
                </div>

                <div className="font-mono text-xs text-faint">{myBooking.ticketCode.slice(0, 16).toUpperCase()}</div>

                {/* İndir */}
                <a
                  href={`/api/qr/${encodeURIComponent(myBooking.ticketCode)}`}
                  download={`bilet-${ticketClass.title.replace(/\s/g, "-")}.svg`}
                  className="btn-secondary btn-sm w-full flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> QR'ı İndir
                </a>
              </div>

              <div className="px-5 pb-5 text-xs text-faint text-center">
                Bu QR kodu ders girişinde okutun.
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
