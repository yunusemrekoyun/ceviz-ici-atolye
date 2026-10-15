'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, BedDouble, LogOut as LogOutIcon, CheckCircle2, Users } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ResRoom {
  id: string;
  name: string;
  floor: number | null;
  roomType: { name: string };
}

interface Res {
  id: string;
  confirmationId: string;
  status: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adultsCount: number;
  childrenCount: number;
  specialRequests?: string | null;
  totalPrice: number;
  room: ResRoom;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ActiveGuests({ tr: isTr }: { tr: boolean }) {
  const [guests, setGuests] = useState<Res[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reservations');
      const data = await res.json();
      if (data.ok) {
        setGuests((data.reservations as Res[]).filter(r => r.status === 'checked_in'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);

  const handleCheckout = useCallback(async (confirmationId: string) => {
    setActionLoading(confirmationId);
    try {
      const res = await fetch('/api/checkin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationId, action: 'checkout' }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccessId(confirmationId);
        setTimeout(() => {
          setGuests(prev => prev.filter(g => g.confirmationId !== confirmationId));
          setSuccessId(null);
        }, 2000);
      } else {
        alert(data.message ?? (isTr ? 'Hata oluştu.' : 'An error occurred.'));
      }
    } finally {
      setActionLoading(null);
    }
  }, [isTr]);

  return (
    <div className="space-y-4 max-w-4xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center">
            <Users size={18} className="text-sky-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-main leading-none">
              {isTr ? 'Aktif Misafirler' : 'Active Guests'}
            </h2>
            <p className="text-[11px] text-subtle mt-0.5">
              {loading ? '…' : `${guests.length} ${isTr ? 'misafir konaklıyor' : 'guests staying'}`}
            </p>
          </div>
        </div>
        <button
          onClick={fetchGuests}
          className="w-9 h-9 rounded-xl border border-m-border hover:bg-m-hover flex items-center justify-center text-subtle hover:text-main transition-colors"
          title={isTr ? 'Yenile' : 'Refresh'}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-brand-accent' : ''} />
        </button>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <RefreshCw size={20} className="animate-spin text-faint" />
          <span className="text-xs text-subtle">{isTr ? 'Yükleniyor…' : 'Loading…'}</span>
        </div>
      ) : guests.length === 0 ? (
        <div className="panel-glass-dashed">
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl surface-soft flex items-center justify-center">
              <BedDouble size={22} className="text-faint" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-subtle">
                {isTr ? 'Şu an otelde misafir yok' : 'No guests currently staying'}
              </p>
              <p className="text-xs text-faint">
                {isTr ? 'Check-in yapılan misafirler burada görünecek' : 'Checked-in guests will appear here'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {guests.map(guest => (
              <motion.div
                key={guest.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
                className="surface-card p-4 hover:border-m-border2 transition-colors"
              >
                <div className="flex items-start gap-4">

                  {/* Room badge */}
                  <div className="w-13 h-13 min-w-[3.25rem] rounded-xl bg-sky-400/8 border border-sky-400/15 flex flex-col items-center justify-center shrink-0 gap-0.5 px-2 py-2.5">
                    <BedDouble size={13} className="text-sky-400" />
                    <span className="text-[11px] font-black text-sky-400 leading-none">{guest.room.name}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-main">
                        {guest.firstName} {guest.lastName}
                      </p>
                      <span className="font-mono text-[10px] text-subtle bg-m-surface2 px-1.5 py-0.5 rounded-md border border-m-border">
                        {guest.confirmationId}
                      </span>
                      {guest.specialRequests && (
                        <span className="text-[10px] text-amber-400/65 font-medium">★ Özel talep</span>
                      )}
                    </div>

                    <p className="text-[11px] text-subtle mt-0.5">
                      {guest.room.roomType.name}
                      {guest.room.floor ? ` · Kat ${guest.room.floor}` : ''}
                    </p>

                    <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px] text-subtle">
                      <span>{fmtDate(guest.checkInDate)}</span>
                      <span className="text-faint">→</span>
                      <span>{fmtDate(guest.checkOutDate)}</span>
                      <span className="text-faint">·</span>
                      <span>{guest.nights} {isTr ? 'gece' : 'nights'}</span>
                      <span className="text-faint">·</span>
                      <span>
                        {guest.adultsCount}{isTr ? 'y' : 'a'}
                        {guest.childrenCount > 0 ? `+${guest.childrenCount}` : ''}
                      </span>
                    </div>

                    {guest.specialRequests && (
                      <p className="text-[11px] text-amber-400/55 italic mt-2 leading-relaxed bg-amber-400/5 border border-amber-400/10 rounded-lg px-3 py-2">
                        {guest.specialRequests}
                      </p>
                    )}
                  </div>

                  {/* Action */}
                  <div className="shrink-0">
                    {successId === guest.confirmationId ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold px-3 py-2">
                        <CheckCircle2 size={14} />
                        {isTr ? 'Çıkış yapıldı' : 'Checked out'}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCheckout(guest.confirmationId)}
                        disabled={actionLoading === guest.confirmationId}
                        className="px-3 py-2 rounded-xl bg-brand-accent/8 hover:bg-brand-accent/18 border border-brand-accent/18 text-brand-accent text-xs font-bold transition-colors disabled:opacity-40 flex items-center gap-1.5"
                      >
                        {actionLoading === guest.confirmationId ? (
                          <RefreshCw size={11} className="animate-spin" />
                        ) : (
                          <LogOutIcon size={11} />
                        )}
                        {isTr ? 'Check-out' : 'Check out'}
                      </button>
                    )}
                  </div>

                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
