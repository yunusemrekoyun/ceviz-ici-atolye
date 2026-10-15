'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, BedDouble,
  CheckCircle2, Clock, XCircle, AlertCircle, MapPin,
  QrCode, X, Loader2, Trash2, User, RefreshCw,
} from 'lucide-react';
import type { AuthUser } from '@/lib/auth/session';
import { formatBirthDate } from '@/components/ui/BirthDateInput';
import { maskTc } from '@/components/ui/TcInput';
import { QRCodeImage } from '@/components/ui/QRCodeImage';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Reservation {
  id: string;
  confirmationId: string;
  status: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  adultsCount: number;
  childrenCount: number;
  totalPrice: number;
  room: { id: string; name: string; roomType: { name: string } };
  // Guest identity fields
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string | null;
  gender: string | null;
  nationality: string | null;
  tcKimlikNo: string | null;
  passportNo: string | null;
  passportExpiry: string | null;
  companyName: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  specialRequests: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function statusBadge(status: string, tr: boolean) {
  switch (status) {
    case 'confirmed':
      return { label: tr ? 'Onaylı' : 'Confirmed', icon: CheckCircle2, cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' };
    case 'pending':
      return { label: tr ? 'Bekliyor' : 'Pending', icon: Clock, cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20' };
    case 'payment_pending':
      return { label: tr ? 'Ödeme Bekliyor' : 'Payment Pending', icon: Clock, cls: 'text-sky-400 bg-sky-400/10 border-sky-400/20' };
    case 'cancelled':
      return { label: tr ? 'İptal Edildi' : 'Cancelled', icon: XCircle, cls: 'text-red-400 bg-red-400/10 border-red-400/20' };
    case 'checked_in':
      return { label: tr ? 'Check-in Yapıldı' : 'Checked In', icon: MapPin, cls: 'text-brand-accent bg-brand-accent/10 border-brand-accent/20' };
    case 'checked_out':
      return { label: tr ? 'Ayrıldı' : 'Checked Out', icon: CheckCircle2, cls: 'text-muted bg-m-surface2 border-m-border' };
    default:
      return { label: status, icon: AlertCircle, cls: 'text-muted bg-m-surface2 border-m-border' };
  }
}

function fmtDate(iso: string, tr: boolean) {
  return new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString(tr ? 'tr-TR' : 'en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── Guest Info Modal ──────────────────────────────────────────────────────────

function GuestInfoModal({ res, onClose, tr }: { res: Reservation; onClose: () => void; tr: boolean }) {
  const rows: { label: string; value: string | null | undefined; full?: boolean }[] = [
    { label: tr ? 'Ad Soyad'         : 'Full Name',        value: `${res.firstName} ${res.lastName}`, full: true },
    { label: tr ? 'E-posta'          : 'Email',            value: res.email,            full: true },
    { label: tr ? 'Telefon'          : 'Phone',            value: res.phone },
    { label: tr ? 'Doğum Tarihi'     : 'Birth Date',       value: formatBirthDate(res.birthDate, tr) },
    { label: tr ? 'Cinsiyet'         : 'Gender',           value: res.gender },
    { label: tr ? 'Uyruk'            : 'Nationality',      value: res.nationality },
    { label: tr ? 'T.C. Kimlik No'   : 'National ID',      value: res.tcKimlikNo ? maskTc(res.tcKimlikNo) : null },
    { label: tr ? 'Pasaport No'      : 'Passport No',      value: res.passportNo ? maskTc(res.passportNo) : null },
    { label: tr ? 'Pasaport Bitiş'   : 'Passport Expiry',  value: res.passportExpiry },
    { label: tr ? 'Şirket'           : 'Company',          value: res.companyName,      full: true },
    { label: tr ? 'Vergi No'         : 'Tax No',           value: res.taxNumber },
    { label: tr ? 'Vergi Dairesi'    : 'Tax Office',       value: res.taxOffice },
  ].filter(r => r.value);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.18 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-sm modal-shell overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-m-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
                <User size={14} className="text-brand-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold text-main">{tr ? 'Misafir Bilgileri' : 'Guest Details'}</p>
                <p className="text-[10px] text-subtle font-mono">{res.confirmationId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-subtle hover:text-main hover:bg-m-hover transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Fields */}
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {rows.map(row => (
                <div key={row.label} className={row.full ? 'col-span-2' : ''}>
                  <p className="text-[9px] uppercase tracking-wider text-subtle mb-0.5">{row.label}</p>
                  <p className="text-xs text-muted font-medium break-all">{row.value}</p>
                </div>
              ))}
            </div>

            {res.specialRequests && (
              <div className="pt-3 border-t border-m-border">
                <p className="text-[9px] uppercase tracking-wider text-subtle mb-1">{tr ? 'Özel İstekler' : 'Special Requests'}</p>
                <p className="text-xs text-muted leading-relaxed italic">"{res.specialRequests}"</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── QR Modal ──────────────────────────────────────────────────────────────────

function QRModal({ code, onClose, tr, title }: { code: string; onClose: () => void; tr: boolean; title?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl p-6 flex flex-col items-center gap-4 shadow-2xl w-72"
      >
        <div className="flex items-center justify-between w-full">
          <p className="text-[#1c1714] text-sm font-semibold">
            {title ?? (tr ? 'Rezervasyon QR' : 'Reservation QR')}
          </p>
          <button onClick={onClose} className="text-[#1c1714]/40 hover:text-[#1c1714] transition-colors">
            <X size={16} />
          </button>
        </div>
        <QRCodeImage value={code} alt={`QR ${code}`} size={220} className="rounded-xl" />
        <div className="text-center">
          <p className="font-mono text-2xl font-bold text-[#1c1714] tracking-[0.2em]">{code}</p>
          <p className="text-[11px] text-[#1c1714]/40 mt-1">
            {tr ? 'Bu kodu resepsiyonda gösterin' : 'Show this code at reception'}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ── Reservation Card ───────────────────────────────────────────────────────────

function ReservationActionModal({ res, tr, mode, onClose, onDone }: {
  res: Reservation; tr: boolean; mode: 'cancel' | 'change'; onClose: () => void; onDone: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelDone, setCancelDone] = useState<{ refund: number } | null>(null);
  const [credit, setCredit] = useState<{ code: string; amount: number } | null>(null);
  const [copied, setCopied] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'cancel') {
        const r = await fetch(`/api/reservations/${res.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cancel' }),
        });
        const d = await r.json().catch(() => null);
        if (d?.ok) { onDone(res.id); setCancelDone({ refund: d.refund?.amount ?? 0 }); }
        else setError(d?.message ?? (tr ? 'İptal edilemedi.' : 'Could not cancel.'));
      } else {
        const r = await fetch(`/api/reservations/${res.id}/convert-to-credit`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
        });
        const d = await r.json().catch(() => null);
        if (d?.ok) { onDone(res.id); setCredit({ code: d.couponCode, amount: d.amount }); }
        else setError(d?.message ?? (tr ? 'İşlem yapılamadı.' : 'Could not process.'));
      }
    } catch {
      setError(tr ? 'Bağlantı hatası.' : 'Connection error.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()} className="w-full max-w-md modal-shell p-5 space-y-4"
      >
        {credit ? (
          <>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center"><CheckCircle2 size={18} className="text-emerald-400" /></div>
              <h3 className="text-base font-bold text-main">{tr ? 'Krediye Dönüştürüldü' : 'Converted to Credit'}</h3>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              {tr
                ? `Rezervasyonunuz iptal edildi ve ödediğiniz ₺${credit.amount.toLocaleString('tr-TR')} bir kredi kuponuna dönüştürüldü. Yeni tarih/oda için rezervasyon yaparken aşağıdaki kodu girin; kalan farkı ödersiniz, kalan bakiye kuponunuzda kalır.`
                : `Your reservation was cancelled and the ₺${credit.amount.toLocaleString('tr-TR')} you paid became a credit coupon. Enter the code below when rebooking and pay only the difference.`}
            </p>
            <button onClick={() => { navigator.clipboard?.writeText(credit.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => null); }}
              className="w-full flex items-center justify-between gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-3 py-2.5 hover:bg-emerald-500/15 transition-colors">
              <span className="font-mono text-sm font-bold text-emerald-300">{credit.code}</span>
              <span className="text-[10px] text-subtle">{copied ? (tr ? 'Kopyalandı!' : 'Copied!') : (tr ? 'Kopyala' : 'Copy')}</span>
            </button>
            <div className="flex gap-2.5">
              <button onClick={onClose} className="btn-secondary flex-1 text-sm">{tr ? 'Kapat' : 'Close'}</button>
              <button onClick={() => window.location.assign('/?screen=reserve')} className="btn-primary flex-1 text-sm">{tr ? 'Yeni Rezervasyon' : 'New Booking'}</button>
            </div>
          </>
        ) : cancelDone ? (
          <>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/12 border border-emerald-500/25 flex items-center justify-center"><CheckCircle2 size={18} className="text-emerald-400" /></div>
              <h3 className="text-base font-bold text-main">{tr ? 'Rezervasyon İptal Edildi' : 'Reservation Cancelled'}</h3>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              {cancelDone.refund > 0
                ? (tr ? `₺${cancelDone.refund.toLocaleString('tr-TR')} tutarındaki iadeniz başlatıldı.` : `Your ₺${cancelDone.refund.toLocaleString('tr-TR')} refund has been initiated.`)
                : (tr ? 'Rezervasyonunuz iptal edildi.' : 'Your reservation has been cancelled.')}
            </p>
            <button onClick={onClose} className="btn-primary w-full text-sm">{tr ? 'Kapat' : 'Close'}</button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mode === 'cancel' ? 'bg-red-500/12 border border-red-500/25' : 'bg-brand-accent/12 border border-brand-accent/25'}`}>
                {mode === 'cancel' ? <Trash2 size={16} className="text-red-400" /> : <RefreshCw size={16} className="text-brand-accent" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-main">{mode === 'cancel' ? (tr ? 'Rezervasyonu İptal Et' : 'Cancel Reservation') : (tr ? 'Rezervasyonu Değiştir' : 'Change Reservation')}</h3>
                <p className="text-[10px] text-subtle font-mono">{res.confirmationId}</p>
              </div>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              {mode === 'cancel'
                ? (tr ? 'Bu rezervasyonu iptal etmek istediğinize emin misiniz? Ödeme yaptıysanız iade işlenecektir.' : 'Are you sure you want to cancel? If you paid, a refund will be processed.')
                : (tr ? 'Değişiklik için rezervasyon iptal edilir ve ödediğiniz tutar bir indirim (kredi) kuponuna dönüştürülür. Sonra yeni tarih/oda için rezervasyon yapıp kuponu kullanarak yalnızca farkı ödersiniz.' : 'To change, the reservation is cancelled and the amount you paid becomes a credit coupon. You then rebook and pay only the difference.')}
            </p>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2.5">
              <button onClick={onClose} className="btn-secondary flex-1 text-sm">{tr ? 'Vazgeç' : 'Cancel'}</button>
              <button onClick={run} disabled={busy}
                className={`flex-1 text-sm rounded-lg py-2.5 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors ${mode === 'cancel' ? 'text-white bg-red-500 hover:bg-red-600' : 'text-brand-emerald bg-brand-accent hover:brightness-105'}`}>
                {busy && <Loader2 size={13} className="animate-spin" />}
                {mode === 'cancel' ? (tr ? 'İptal Et' : 'Cancel') : (tr ? 'Krediye Dönüştür' : 'Convert to Credit')}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function ReservationCard({ res, tr, onCancel, checkInTime, checkOutTime }: { res: Reservation; tr: boolean; onCancel: (id: string) => void; checkInTime: string; checkOutTime: string }) {
  const [showQR, setShowQR] = useState(false);
  const [showCheckoutQR, setShowCheckoutQR] = useState(false);
  const [showGuest, setShowGuest] = useState(false);
  const [actionMode, setActionMode] = useState<'cancel' | 'change' | null>(null);
  const badge = statusBadge(res.status, tr);
  const BadgeIcon = badge.icon;
  const now = new Date();
  const checkIn = new Date(res.checkInDate.slice(0, 10) + 'T12:00:00');
  const checkOut = new Date(res.checkOutDate.slice(0, 10) + 'T12:00:00');
  const isCheckoutDay = res.status === 'checked_in' && now.toDateString() === checkOut.toDateString();
  const isUpcoming = checkIn > now && res.status !== 'cancelled';
  const daysLeft = Math.ceil((checkIn.getTime() - now.getTime()) / 86400000);
  const canCancel = isUpcoming && ['pending', 'confirmed'].includes(res.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card p-4 hover:border-m-border2 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-accent/10 border border-brand-accent/15 flex items-center justify-center shrink-0">
            <BedDouble size={14} className="text-brand-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-main leading-none">{res.room.name}</p>
            <p className="text-[10px] text-subtle mt-0.5">{res.room.roomType.name}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold shrink-0 ${badge.cls}`}>
          <BadgeIcon size={10} />
          {badge.label}
        </div>
      </div>

      <div className="grid grid-cols-1 min-[440px]:grid-cols-3 gap-2 mb-3">
        <div className="surface-card-raised p-2">
          <p className="text-subtle text-[9px] uppercase tracking-wider mb-0.5">
            {tr ? 'Giriş' : 'Check-in'}
          </p>
          <p className="text-main font-medium text-[11px]">{fmtDate(res.checkInDate, tr)}</p>
          <p className="text-brand-accent/70 text-[10px] font-semibold tabular-nums">{checkInTime}</p>
        </div>
        <div className="surface-card-raised p-2">
          <p className="text-subtle text-[9px] uppercase tracking-wider mb-0.5">
            {tr ? 'Çıkış' : 'Check-out'}
          </p>
          <p className="text-main font-medium text-[11px]">{fmtDate(res.checkOutDate, tr)}</p>
          <p className="text-brand-accent/70 text-[10px] font-semibold tabular-nums">{checkOutTime}</p>
        </div>
        <div className="surface-card-raised p-2">
          <p className="text-subtle text-[9px] uppercase tracking-wider mb-0.5">
            {tr ? 'Gece / Kişi' : 'Nights / Guests'}
          </p>
          <p className="text-main font-medium text-[11px]">
            {res.nights}{tr ? 'g' : 'n'} · {res.adultsCount}{tr ? 'y' : 'a'}{res.childrenCount > 0 ? `+${res.childrenCount}` : ''}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] text-subtle">{tr ? 'Onay Kodu' : 'Confirmation'}</p>
          <p className="text-xs font-mono text-brand-accent/80 tracking-widest">{res.confirmationId}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2 sm:justify-end">
          <button
            onClick={() => setShowGuest(true)}
            className="btn-secondary min-h-8 px-2.5 py-1.5 text-[10px]"
          >
            <User size={11} />
            {tr ? 'Misafir' : 'Guest'}
          </button>
          {res.status !== 'cancelled' && (
            <button
              onClick={() => setShowQR(true)}
              className="btn-secondary min-h-8 px-2.5 py-1.5 text-[10px]"
            >
              <QrCode size={11} />
              QR
            </button>
          )}
          {isCheckoutDay && (
            <button
              onClick={() => setShowCheckoutQR(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-accent/10 hover:bg-brand-accent/15 border border-brand-accent/30 text-brand-accent text-[10px] font-medium transition-colors"
            >
              <QrCode size={11} />
              {tr ? 'Çıkış QR' : 'Check-out QR'}
            </button>
          )}
          <div className="min-w-[5rem] text-left sm:text-right">
            <p className="text-[10px] text-subtle">{tr ? 'Toplam' : 'Total'}</p>
            <p className="text-sm font-bold text-brand-accent">₺{res.totalPrice.toLocaleString('tr-TR')}</p>
          </div>
        </div>
      </div>

      {isUpcoming && (
        <div className="mt-2 pt-2 border-t border-m-border flex items-center justify-between gap-2">
          <p className="text-[10px] text-brand-accent/60">
            {tr ? `Check-in'e ${daysLeft} gün kaldı` : `${daysLeft} days until check-in`}
          </p>
          {canCancel && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setActionMode('change')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-brand-accent/70 hover:text-brand-accent hover:bg-brand-accent/8 border border-transparent hover:border-brand-accent/15 transition-colors"
              >
                <RefreshCw size={10} />
                {tr ? 'Değiştir' : 'Change'}
              </button>
              <button
                onClick={() => setActionMode('cancel')}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-red-400/60 hover:text-red-400 hover:bg-red-400/8 border border-transparent hover:border-red-400/15 transition-colors"
              >
                <Trash2 size={10} />
                {tr ? 'İptal Et' : 'Cancel'}
              </button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showQR         && <QRModal code={res.confirmationId} onClose={() => setShowQR(false)} tr={tr} />}
        {showCheckoutQR && <QRModal code={res.confirmationId} onClose={() => setShowCheckoutQR(false)} tr={tr} title={tr ? 'Çıkış QR' : 'Check-out QR'} />}
        {showGuest      && <GuestInfoModal res={res} onClose={() => setShowGuest(false)} tr={tr} />}
        {actionMode     && <ReservationActionModal res={res} tr={tr} mode={actionMode} onClose={() => setActionMode(null)} onDone={onCancel} />}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function CustomerReservations({ user, tr }: { user: AuthUser; tr: boolean }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [checkInTime,  setCheckInTime]  = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('12:00');

  useEffect(() => {
    fetch('/api/settings/checkin-times')
      .then(r => r.json())
      .then(data => {
        if (data.ok) { setCheckInTime(data.checkInTime); setCheckOutTime(data.checkOutTime); }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch('/api/reservations')
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          // Hide transient "payment_pending" holds — they are not real bookings yet.
          setReservations((data.reservations as Reservation[]).filter(r => r.status !== 'payment_pending'));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user.id]);

  function handleCancel(id: string) {
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));
  }

  const now = new Date();

  const filtered = reservations.filter(r => {
    const checkOut = new Date(r.checkOutDate.slice(0, 10) + 'T12:00:00');
    const checkIn  = new Date(r.checkInDate.slice(0, 10)  + 'T12:00:00');
    if (tab === 'upcoming') return checkIn >= now && r.status !== 'cancelled';
    if (tab === 'past')     return checkOut < now || r.status === 'cancelled';
    return true;
  });

  const tabs = [
    { id: 'upcoming' as const, label: tr ? 'Yaklaşan' : 'Upcoming' },
    { id: 'past'     as const, label: tr ? 'Geçmiş'   : 'Past'     },
    { id: 'all'      as const, label: tr ? 'Tümü'     : 'All'      },
  ];

  return (
    <div className="space-y-4">
      <div className="tab-list w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`tab-item min-h-8 px-4 py-1.5 ${
              tab === t.id
                ? 'tab-item-active'
                : ''
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center text-subtle text-sm">
          {tr ? 'Yükleniyor…' : 'Loading…'}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-xl surface-card flex items-center justify-center">
            <Calendar size={20} className="text-subtle" />
          </div>
          <p className="text-sm text-subtle">
            {tr ? 'Bu kategoride rezervasyon bulunamadı.' : 'No reservations found in this category.'}
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid gap-3 xl:grid-cols-2">
            {filtered.map(r => (
              <ReservationCard key={r.id} res={r} tr={tr} onCancel={handleCancel} checkInTime={checkInTime} checkOutTime={checkOutTime} />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
