'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Minus, Plus, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { addMonths, startOfDay } from '@/components/ui/CalendarPicker';
import { IyzicoCheckoutForm, type PaymentSession } from '@/components/ReservationScreen';
import { QRCodeImage } from '@/components/ui/QRCodeImage';
import { StepperDots } from '../StepperDots';
import { ScreenHeader } from '../ScreenHeader';
import { HotelCalendar } from '../HotelCalendar';
import type { RoomData } from '../types';

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const nights = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// Booking wizard — design-refs/refs.pdf pages 5-10. Guest checkout (payment-session
// supports anonymous bookings); real iyzico iframe for payment + QR confirmation.
export function MobileBooking({
  rooms,
  initialRoomTypeId,
  onExit,
}: {
  rooms: RoomData[];
  initialRoomTypeId?: string | null;
  onExit: () => void;
}) {
  const { language } = useLanguage();
  const tr = language === 'tr';
  const today = useMemo(() => startOfDay(new Date()), []);

  const roomTypes = useMemo(() => {
    const map = new Map<string, { id: string; name: string; price: number }>();
    for (const r of rooms) {
      if (!map.has(r.roomTypeId)) {
        map.set(r.roomTypeId, { id: r.roomTypeId, name: r.roomType?.name ?? r.name, price: r.basePrice });
      }
    }
    return [...map.values()];
  }, [rooms]);

  const [step, setStep] = useState(0);
  const [roomTypeId, setRoomTypeId] = useState(initialRoomTypeId ?? '');
  const [month, setMonth] = useState(today);
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [selecting, setSelecting] = useState<'in' | 'out'>('in');
  const [hovered, setHovered] = useState<Date | null>(null);
  const [booked, setBooked] = useState<Set<string>>(new Set());
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    tcKimlikNo: '', passportNo: '', nationality: '',
  });
  const [foreign, setForeign] = useState(false);
  const [kvkk, setKvkk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [result, setResult] = useState<{ confirmationId: string } | null>(null);

  useEffect(() => {
    if (!roomTypeId && roomTypes.length > 0) setRoomTypeId(roomTypes[0].id);
  }, [roomTypeId, roomTypes]);

  // Availability for the visible month + next.
  useEffect(() => {
    if (!roomTypeId) {
      setBooked(new Set());
      return;
    }
    let cancelled = false;
    Promise.all(
      [month, addMonths(month, 1)].map((mn) =>
        fetch(`/api/public/availability?year=${mn.getFullYear()}&month=${mn.getMonth()}&roomTypeId=${roomTypeId}`)
          .then((r) => r.json())
          .catch(() => null),
      ),
    ).then((responses) => {
      if (cancelled) return;
      const next = new Set<string>();
      for (const res of responses) if (res?.ok) for (const d of res.unavailableDates as string[]) next.add(d);
      setBooked(next);
    });
    return () => {
      cancelled = true;
    };
  }, [roomTypeId, month]);

  // Poll payment status while on the payment step.
  useEffect(() => {
    if (step !== 2 || !session || result) return;
    let active = true;
    const check = async () => {
      try {
        const r = await fetch(`/api/payments/${session.id}/status`, { cache: 'no-store' });
        const d = await r.json();
        if (!active) return;
        if (d?.ok && (d.payment?.status === 'paid' || d.reservation?.paymentStatus === 'paid')) {
          setResult({ confirmationId: d.reservation?.confirmationId ?? session.confirmationId });
        }
      } catch {
        /* keep polling */
      }
    };
    const id = setInterval(check, 3000);
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'garden-payment-callback' && e.data.paymentId === session.id) check();
    };
    window.addEventListener('message', onMsg);
    return () => {
      active = false;
      clearInterval(id);
      window.removeEventListener('message', onMsg);
    };
  }, [step, session, result]);

  const hasBookedNightBetween = (a: Date, b: Date) => {
    const d = new Date(a);
    while (d < b) {
      if (booked.has(dateKey(d))) return true;
      d.setDate(d.getDate() + 1);
    }
    return false;
  };

  const isDateUnavailable = (date: Date) => {
    if (date < today) return true;
    if (selecting === 'in' || !checkIn || date <= checkIn) return booked.has(dateKey(date));
    return hasBookedNightBetween(checkIn, date);
  };

  const onSelectDate = (date: Date) => {
    if (isDateUnavailable(date)) return;
    if (!checkIn || selecting === 'in' || date <= checkIn) {
      setCheckIn(date);
      setCheckOut(null);
      setSelecting('out');
    } else {
      setCheckOut(date);
      setSelecting('in');
    }
  };

  const selectedType = roomTypes.find((t) => t.id === roomTypeId) ?? null;
  const nightCount = checkIn && checkOut ? nights(checkIn, checkOut) : 0;
  const total = selectedType ? selectedType.price * nightCount : 0;
  const canContinue =
    !!roomTypeId && !!checkIn && !!checkOut && checkOut > checkIn && !hasBookedNightBetween(checkIn, checkOut);
  // payment-session requires either an 11-digit TC kimlik no or a passport no.
  const idValid = foreign ? form.passportNo.trim().length >= 3 : /^\d{11}$/.test(form.tcKimlikNo);
  const canPay =
    form.firstName.trim() && form.lastName.trim() && isEmail(form.email) && form.phone.trim() && idValid && kvkk;

  async function submit() {
    if (!checkIn || !checkOut) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/reservations/payment-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomTypeId,
          checkInDate: dateKey(checkIn),
          checkOutDate: dateKey(checkOut),
          adultsCount: adults,
          childrenCount: children,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          nationality: foreign ? form.nationality.trim().toUpperCase() || 'TR' : 'TR',
          ...(foreign
            ? { passportNo: form.passportNo.trim() }
            : { tcKimlikNo: form.tcKimlikNo.trim() }),
          kvkkAccepted: true,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message ?? (tr ? 'Bir hata oluştu.' : 'Something went wrong.'));
        return;
      }
      if (data.confirmed) {
        setResult({ confirmationId: data.confirmed.confirmationId });
        return;
      }
      setSession(data.payment as PaymentSession);
      setStep(2);
    } catch {
      setError(tr ? 'Bağlantı hatası.' : 'Connection error.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Result ──
  if (result) {
    return (
      <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full border border-hotel-peach/30 bg-hotel-peach/15">
          <CheckCircle2 size={32} className="text-hotel-peach" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-hotel-text-primary">
          {tr ? 'Rezervasyon Onaylandı!' : 'Reservation Confirmed!'}
        </h2>
        <div className="rounded-2xl bg-white p-4">
          <QRCodeImage value={result.confirmationId} alt="QR" size={180} className="block rounded-xl" />
        </div>
        <div className="card-hotel px-6 py-3">
          <p className="font-mono text-lg font-bold tracking-widest text-hotel-peach">{result.confirmationId}</p>
        </div>
        <p className="max-w-xs font-hotel text-sm text-hotel-text-muted">
          {tr
            ? 'QR kodu veya onay kodunu resepsiyonda göstererek check-in yapabilirsiniz.'
            : 'Show the QR code or confirmation code at reception to check in.'}
        </p>
        <button type="button" onClick={onExit} className="btn-hotel mt-2">
          {tr ? 'Ana Sayfa' : 'Home'}
        </button>
      </div>
    );
  }

  const back = () => (step > 0 ? setStep((s) => s - 1) : onExit());

  return (
    <div className="space-y-5 px-4 py-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          aria-label={tr ? 'Geri' : 'Back'}
          className="-ml-1 flex items-center gap-0.5 font-hotel text-base text-hotel-text-primary"
        >
          <ChevronLeft size={20} />
          {tr ? 'Geri' : 'Back'}
        </button>
        <StepperDots total={3} current={step} />
        <span className="w-12" />
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
      {/* ── Step 1: room + dates + guests ── */}
      {step === 0 && (
        <div className="space-y-6">
          <ScreenHeader
            eyebrow={tr ? 'Rezervasyon' : 'Reservation'}
            title={tr ? 'Oda & Tarih' : 'Room & Dates'}
            size="h2"
          />
          <div className="space-y-2">
            <label className="font-hotel text-sm text-hotel-text-muted">
              {tr ? 'Oda Seçimi' : 'Room Selection'}
            </label>
            <div className="relative">
              <select
                value={roomTypeId}
                onChange={(e) => {
                  setRoomTypeId(e.target.value);
                  setCheckIn(null);
                  setCheckOut(null);
                  setSelecting('in');
                }}
                className="input-hotel appearance-none pr-10"
              >
                {roomTypes.length === 0 && <option value="">{tr ? 'Yükleniyor…' : 'Loading…'}</option>}
                {roomTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronRight
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-hotel-text-muted"
                size={18}
              />
            </div>
          </div>

          <HotelCalendar
            month={month}
            onMonthChange={(delta) => setMonth((mm) => addMonths(mm, delta))}
            checkIn={checkIn}
            checkOut={checkOut}
            hovered={hovered}
            onHover={setHovered}
            onSelect={onSelectDate}
            isDateUnavailable={isDateUnavailable}
            today={today}
            tr={tr}
          />

          <div className="grid grid-cols-2 gap-4">
            <GuestStepper label={tr ? 'Yetişkin' : 'Adults'} value={adults} min={1} onChange={setAdults} />
            <GuestStepper label={tr ? 'Çocuk' : 'Children'} value={children} min={0} onChange={setChildren} />
          </div>

          {nightCount > 0 && selectedType && (
            <p className="text-center font-hotel text-sm text-hotel-text-muted">
              {nightCount} {tr ? 'gece' : 'night'} ·{' '}
              <span className="font-bold text-hotel-peach">₺{total.toLocaleString('tr-TR')}</span>
            </p>
          )}
          <button type="button" disabled={!canContinue} onClick={() => setStep(1)} className="btn-hotel disabled:opacity-40">
            {tr ? 'Devam Et' : 'Continue'} →
          </button>
        </div>
      )}

      {/* ── Step 2: details ── */}
      {step === 1 && (
        <div className="space-y-5">
          <ScreenHeader
            eyebrow={tr ? 'Rezervasyon' : 'Reservation'}
            title={tr ? 'Rezervasyon Detayları' : 'Booking Details'}
            size="h2"
          />
          <div className="card-hotel space-y-4 p-5">
            <LabeledInput label={tr ? 'Ad' : 'First name'} value={form.firstName} onChange={(v) => setForm((f) => ({ ...f, firstName: v }))} />
            <LabeledInput label={tr ? 'Soyad' : 'Last name'} value={form.lastName} onChange={(v) => setForm((f) => ({ ...f, lastName: v }))} />
            <LabeledInput label="E-posta" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
            <LabeledInput label={tr ? 'Telefon' : 'Phone'} type="tel" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
            <label className="flex items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                checked={foreign}
                onChange={(e) => setForeign(e.target.checked)}
                className="h-4 w-4 shrink-0 accent-hotel-peach"
              />
              <span className="font-hotel text-xs leading-relaxed text-hotel-text-muted">
                {tr ? 'Yabancı uyrukluyum' : 'I am a foreign national'}
              </span>
            </label>
            {foreign ? (
              <>
                <LabeledInput
                  label={tr ? 'Pasaport No' : 'Passport No'}
                  value={form.passportNo}
                  onChange={(v) => setForm((f) => ({ ...f, passportNo: v }))}
                />
                <LabeledInput
                  label={tr ? 'Uyruk' : 'Nationality'}
                  placeholder="DE, FR, US…"
                  maxLength={3}
                  value={form.nationality}
                  onChange={(v) => setForm((f) => ({ ...f, nationality: v.toUpperCase() }))}
                />
              </>
            ) : (
              <LabeledInput
                label={tr ? 'T.C. Kimlik No' : 'National ID (TC)'}
                type="tel"
                maxLength={11}
                value={form.tcKimlikNo}
                onChange={(v) => setForm((f) => ({ ...f, tcKimlikNo: v.replace(/\D/g, '') }))}
              />
            )}
            <label className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                checked={kvkk}
                onChange={(e) => setKvkk(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-hotel-peach"
              />
              <span className="font-hotel text-xs leading-relaxed text-hotel-text-muted">
                {tr
                  ? 'Kişisel verilerimin rezervasyon amacıyla işlenmesini (KVKK) kabul ediyorum.'
                  : 'I accept the processing of my personal data for the reservation (KVKK).'}
              </span>
            </label>
          </div>

          {error && <p className="font-hotel text-sm text-red-400">{error}</p>}

          <button type="button" disabled={!canPay || submitting} onClick={submit} className="btn-hotel disabled:opacity-40">
            {submitting ? (tr ? 'Hazırlanıyor…' : 'Preparing…') : `${tr ? 'Ödemeye Geç' : 'Continue to Payment'} →`}
          </button>
        </div>
      )}

      {/* ── Step 3: payment ── */}
      {step === 2 && session && (
        <div className="space-y-5">
          <ScreenHeader
            eyebrow={tr ? 'Rezervasyon' : 'Reservation'}
            title={tr ? 'Ödeme Bilgileri' : 'Payment'}
            size="h2"
          />
          <div className="card-hotel p-6 text-center">
            <p className="font-serif text-xl text-hotel-text-muted">{tr ? 'Toplam Tutar' : 'Total'}</p>
            <p className="mt-1 font-serif text-4xl font-bold text-hotel-text-primary">
              ₺{session.amount.toLocaleString('tr-TR')}
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-hotel-border">
            <div className="flex items-center gap-2 border-b border-hotel-border bg-hotel-surface px-4 py-3">
              <ShieldCheck size={16} className="text-hotel-peach" />
              <span className="font-hotel text-sm font-medium text-hotel-text-primary">
                {tr ? 'Güvenli Ödeme' : 'Secure Payment'}
              </span>
              <span className="ml-auto font-hotel text-[11px] tracking-wide text-hotel-text-muted">iyzico</span>
            </div>
            <IyzicoCheckoutForm html={session.checkoutFormContent} paymentPageUrl={session.paymentPageUrl} tr={tr} />
          </div>
          <p className="text-center font-hotel text-xs text-hotel-text-muted">
            {tr
              ? 'Kart bilgileriniz iyzico güvenli alanında işlenir. Ödeme sonrası onayınız otomatik görünür.'
              : 'Card details are processed inside iyzico secure checkout. Confirmation appears automatically.'}
          </p>
        </div>
      )}
      </motion.div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label className="font-hotel text-xs uppercase tracking-wider text-hotel-text-muted">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        maxLength={maxLength}
        className="input-hotel"
      />
    </div>
  );
}

function GuestStepper({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="font-hotel text-sm text-hotel-text-muted">{label}</p>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="grid h-10 w-10 place-items-center rounded-full bg-hotel-peach text-hotel-bg disabled:opacity-40"
        >
          <Minus size={18} />
        </button>
        <span className="font-hotel text-lg font-semibold text-hotel-text-primary">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="grid h-10 w-10 place-items-center rounded-full bg-hotel-peach text-hotel-bg"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
