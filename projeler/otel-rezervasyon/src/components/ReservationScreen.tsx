'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar, ChevronLeft, ChevronRight, X, Check,
  User, Phone, Mail, Building2, FileText, BedDouble,
  Loader2, CheckCircle2, AlertCircle, ChevronDown,
  CreditCard, ShieldCheck, Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  CalendarMonth, SingleDatePickerModal,
  startOfDay, addMonths,
} from '@/components/ui/CalendarPicker';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { TcInput } from '@/components/ui/TcInput';
import { QRCodeImage } from '@/components/ui/QRCodeImage';

// ── Types ──────────────────────────────────────────────────────────────────────

interface RoomData {
  id: string;
  roomTypeId: string;
  name: string;
  basePrice: number;
  description: string | null;
  available: boolean;
  maxAdults: number;
  maxChildren: number;
  roomType: { id: string; name: string; amenities: string[] };
}

interface GuestForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  gender: string;
  nationality: string;
  tcKimlikNo: string;
  passportNo: string;
  passportExpiry: string;
  companyName: string;
  taxNumber: string;
  taxOffice: string;
  specialRequests: string;
  adultsCount: number;
  childrenCount: number;
}

interface AccountProfile {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  birthDate: string | null;
  gender: string | null;
  nationality: string | null;
  tcKimlikNo: string | null;
  passportNo: string | null;
  passportExpiry: string | null;
}

type ProfileDecision = 'entered' | 'account';
type NewAccountProfileOwner = 'self' | 'guest';

interface AccountPerson {
  id: string;
  label: string;
  relation: string;
  isDefault: boolean;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  gender: string | null;
  nationality: string | null;
  tcKimlikNo: string | null;
  passportNo: string | null;
  passportExpiry: string | null;
  companyName: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
}

export interface PaymentSession {
  id: string;
  reservationId: string;
  confirmationId: string;
  status: string;
  amount: number;
  currency: string;
  expiresAt: string | null;
  paymentPageUrl: string | null;
  checkoutFormContent: string | null;
}

export function IyzicoCheckoutForm({
  html,
  paymentPageUrl,
  tr,
}: {
  html: string | null;
  paymentPageUrl: string | null;
  tr: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !html) return;

    const win = window as Window & {
      iyziInit?: unknown;
      iyziUcsInit?: unknown;
    };

    const removeIyzicoBundles = () => {
      document
        .querySelectorAll('script[src*="iyzipay.com/checkoutform"]')
        .forEach((node) => node.remove());
    };

    // iyzico's snippet declares `var iyziInit = {...}` at global scope, which
    // creates a non-configurable window property — `delete` throws in strict
    // mode ("Cannot delete property 'iyziInit'"). Reset to undefined instead so
    // the snippet's `typeof iyziInit == 'undefined'` guard runs again on every
    // (re)mount and re-renders the form.
    win.iyziInit = undefined;
    win.iyziUcsInit = undefined;
    removeIyzicoBundles();

    container.innerHTML = '';

    const checkoutMount = document.createElement('div');
    checkoutMount.id = 'iyzipay-checkout-form';
    checkoutMount.className = 'responsive';
    container.appendChild(checkoutMount);

    const fragment = document.createElement('div');
    fragment.innerHTML = html;
    const scripts = Array.from(fragment.querySelectorAll('script'));
    scripts.forEach(script => script.remove());

    while (fragment.firstChild) {
      container.appendChild(fragment.firstChild);
    }

    scripts.forEach((sourceScript) => {
      const script = document.createElement('script');
      Array.from(sourceScript.attributes).forEach((attr) => {
        script.setAttribute(attr.name, attr.value);
      });
      script.text = sourceScript.textContent ?? '';
      container.appendChild(script);
    });

    return () => {
      container.innerHTML = '';
      removeIyzicoBundles();
      win.iyziInit = undefined;
      win.iyziUcsInit = undefined;
    };
  }, [html]);

  if (!html && paymentPageUrl) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 bg-white p-5 text-center text-black/70">
        <p className="text-sm">
          {tr
            ? 'Ödeme formu doğrudan yüklenemedi. Iyzico güvenli ödeme sayfasını açabilirsiniz.'
            : 'The embedded payment form could not be loaded. You can open the iyzico secure payment page.'}
        </p>
        <a
          href={paymentPageUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          {tr ? 'Ödeme Sayfasını Aç' : 'Open Payment Page'}
        </a>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-black/60">
        {tr ? 'Ödeme formu hazırlanıyor…' : 'Preparing payment form…'}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-[430px] bg-white [&_iframe]:w-full [&_iframe]:max-w-full"
    />
  );
}

const emptyForm: GuestForm = {
  firstName: '', lastName: '', email: '', phone: '',
  birthDate: '', gender: '', nationality: 'TR',
  tcKimlikNo: '', passportNo: '', passportExpiry: '',
  companyName: '', taxNumber: '', taxOffice: '',
  specialRequests: '', adultsCount: 1, childrenCount: 0,
};

function normalizeProfileValue(value: string | null | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
}

function getGuestProfileMismatchLabels(profile: AccountProfile | null, form: GuestForm, isTurkish: boolean, tr: boolean) {
  if (!profile) return [];

  const fields = [
    { label: tr ? 'Ad' : 'First name', account: profile.firstName, entered: form.firstName },
    { label: tr ? 'Soyad' : 'Last name', account: profile.lastName, entered: form.lastName },
    { label: tr ? 'Telefon' : 'Phone', account: profile.phone, entered: form.phone },
    ...(isTurkish
      ? [{ label: tr ? 'T.C. kimlik no' : 'National ID', account: profile.tcKimlikNo, entered: form.tcKimlikNo }]
      : [{ label: tr ? 'Pasaport no' : 'Passport no', account: profile.passportNo, entered: form.passportNo }]),
  ];

  return fields
    .filter(({ account, entered }) => account && entered && normalizeProfileValue(account) !== normalizeProfileValue(entered))
    .map(({ label }) => label);
}

function formWithAccountProfile(form: GuestForm, profile: AccountProfile): GuestForm {
  return {
    ...form,
    firstName: profile.firstName || form.firstName,
    lastName: profile.lastName || form.lastName,
    phone: profile.phone || form.phone,
    birthDate: profile.birthDate || form.birthDate,
    gender: profile.gender || form.gender,
    nationality: profile.nationality || form.nationality,
    tcKimlikNo: profile.tcKimlikNo || form.tcKimlikNo,
    passportNo: profile.passportNo || form.passportNo,
    passportExpiry: profile.passportExpiry || form.passportExpiry,
  };
}

// ── DatePickerModal ────────────────────────────────────────────────────────────

interface DatePickerModalProps {
  checkIn: Date | null;
  checkOut: Date | null;
  roomTypeId?: string;
  roomName?: string;
  onConfirm: (ci: Date, co: Date) => void;
  onClose: () => void;
  tr: boolean;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return startOfDay(new Date(year, month - 1, day));
}

function addDays(date: Date, days: number) {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

function DatePickerModal({ checkIn: initCi, checkOut: initCo, roomTypeId, roomName, onConfirm, onClose, tr }: DatePickerModalProps) {
  const today = startOfDay(new Date());
  const [leftMonth, setLeftMonth] = useState(() => {
    const base = initCi ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [checkIn, setCheckIn] = useState<Date | null>(initCi);
  const [checkOut, setCheckOut] = useState<Date | null>(initCo);
  const [hovered, setHovered] = useState<Date | null>(null);
  const [selecting, setSelecting] = useState<'in' | 'out'>(initCi ? 'out' : 'in');
  const [bookedDates, setBookedDates] = useState<Set<string>>(() => new Set());
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const rightMonth = addMonths(leftMonth, 1);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!roomTypeId) {
      setBookedDates(new Set());
      setLoadingAvailability(false);
      return;
    }

    let cancelled = false;

    async function loadAvailability() {
      setLoadingAvailability(true);
      try {
        const months = [leftMonth, rightMonth];
        const responses = await Promise.all(months.map((monthDate) => {
          const params = new URLSearchParams({
            year: String(monthDate.getFullYear()),
            month: String(monthDate.getMonth()),
            roomTypeId: roomTypeId!,
          });
          return fetch(`/api/public/availability?${params}`).then((response) => response.json());
        }));

        if (cancelled) return;

        const next = new Set<string>();
        for (const response of responses) {
          if (!response?.ok) continue;
          for (const date of response.unavailableDates as string[]) {
            next.add(date);
          }
        }

        setBookedDates(next);
      } catch {
        if (!cancelled) setBookedDates(new Set());
      } finally {
        if (!cancelled) setLoadingAvailability(false);
      }
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [leftMonth, roomTypeId]);

  function hasBookedNightBetween(start: Date, end: Date) {
    let day = startOfDay(start);
    const endDay = startOfDay(end);

    while (day < endDay) {
      if (bookedDates.has(dateKey(day))) return true;
      day = addDays(day, 1);
    }

    return false;
  }

  function isDateUnavailable(date: Date) {
    if (!roomTypeId) return false;
    if (!checkIn || selecting === 'in' || date <= checkIn) return bookedDates.has(dateKey(date));

    return hasBookedNightBetween(checkIn, date);
  }

  function handleSelect(date: Date) {
    if (isDateUnavailable(date)) return;

    if (selecting === 'in') {
      setCheckIn(date);
      setCheckOut(null);
      setSelecting('out');
    } else {
      if (checkIn && date <= checkIn) {
        setCheckIn(date);
        setCheckOut(null);
        setSelecting('out');
      } else {
        setCheckOut(date);
        setSelecting('in');
      }
    }
  }

  const canConfirm = checkIn && checkOut && checkOut > checkIn && !hasBookedNightBetween(checkIn, checkOut);

  const nightCount = canConfirm
    ? Math.round((checkOut!.getTime() - checkIn!.getTime()) / 86400000)
    : 0;

  const formatDate = (d: Date | null) => {
    if (!d) return tr ? 'Seçilmedi' : 'Not selected';
    return d.toLocaleDateString(tr ? 'tr-TR' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={e => e.stopPropagation()}
        className="modal-shell p-5 w-full max-w-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <button
                onClick={() => setSelecting('in')}
                className={`pb-1 border-b-2 transition-colors ${selecting === 'in' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-muted hover:text-main'}`}
              >
                {tr ? 'Giriş' : 'Check-in'}: <span className="font-semibold">{formatDate(checkIn)}</span>
              </button>
              <button
                onClick={() => checkIn && setSelecting('out')}
                className={`pb-1 border-b-2 transition-colors ${selecting === 'out' ? 'border-brand-accent text-brand-accent' : 'border-transparent text-muted hover:text-main'}`}
              >
                {tr ? 'Çıkış' : 'Check-out'}: <span className="font-semibold">{formatDate(checkOut)}</span>
              </button>
              {nightCount > 0 && (
                <span className="text-subtle text-xs self-end mb-0.5">
                  {nightCount} {tr ? 'gece' : 'night'}
                </span>
              )}
            </div>
            {roomTypeId && (
              <p className="mt-2 text-[11px] text-subtle">
                {loadingAvailability
                  ? (tr ? 'Odanın müsait günleri kontrol ediliyor…' : 'Checking available dates for this room…')
                  : (tr
                    ? `${roomName ?? 'Seçili oda'} için dolu tarihler kapalı gösteriliyor.`
                    : `Booked dates are disabled for ${roomName ?? 'the selected room'}.`)}
              </p>
            )}
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-m-surface2 hover:bg-m-hover flex items-center justify-center text-muted hover:text-main">
            <X size={14} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setLeftMonth(m => addMonths(m, -1))}
            className="w-8 h-8 rounded-lg bg-m-surface2 hover:bg-m-hover flex items-center justify-center text-muted hover:text-main"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setLeftMonth(m => addMonths(m, 1))}
            className="w-8 h-8 rounded-lg bg-m-surface2 hover:bg-m-hover flex items-center justify-center text-muted hover:text-main"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Two months */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6">
          <CalendarMonth
            year={leftMonth.getFullYear()} month={leftMonth.getMonth()}
            checkIn={checkIn} checkOut={checkOut} hovered={hovered} today={today}
            minDate={today}
            bookedDates={bookedDates}
            isDateUnavailable={isDateUnavailable}
            onSelect={handleSelect} onHover={setHovered} tr={tr}
          />
          <div className="hidden md:block w-px bg-m-border" />
          {/* Second month is desktop-only; on mobile use the month arrows above. */}
          <div className="hidden md:block">
            <CalendarMonth
              year={rightMonth.getFullYear()} month={rightMonth.getMonth()}
              checkIn={checkIn} checkOut={checkOut} hovered={hovered} today={today}
              minDate={today}
              bookedDates={bookedDates}
              isDateUnavailable={isDateUnavailable}
              onSelect={handleSelect} onHover={setHovered} tr={tr}
            />
          </div>
        </div>

        {/* Confirm */}
        <div className="mt-5 flex justify-end">
          <button
            disabled={!canConfirm || loadingAvailability}
            onClick={() => canConfirm && onConfirm(checkIn!, checkOut!)}
            className="px-5 py-2 rounded-lg bg-brand-accent text-black text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-accent/90 transition-colors"
          >
            {tr ? 'Tarihleri Onayla' : 'Confirm Dates'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return mounted ? createPortal(modal, document.body) : null;
}

// ── Step indicator ─────────────────────────────────────────────────────────────

const STEPS = ['Oda & Tarih', 'Misafir Bilgileri', 'Onay', 'Ödeme'];

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
            i < step ? 'bg-brand-accent text-black' : i === step ? 'bg-brand-accent/20 border border-brand-accent text-brand-accent' : 'bg-white/5 text-white/20'
          }`}>
            {i < step ? <Check size={12} /> : i + 1}
          </div>
          <span className={`text-[10px] font-medium hidden sm:block ${i === step ? 'text-brand-accent' : i < step ? 'text-white/50' : 'text-white/20'}`}>
            {label}
          </span>
          {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? 'bg-brand-accent/40' : 'bg-white/5'}`} />}
        </div>
      ))}
    </div>
  );
}

// ── Input helpers ──────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ label, required, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-subtle uppercase tracking-wider font-medium">
        {label}{required && <span className="text-brand-accent ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'control-base px-3 py-2 text-sm';
const selectCls = `${inputCls} appearance-none`;

// ── Main Component ─────────────────────────────────────────────────────────────

export function ReservationScreen() {
  const { language } = useLanguage();
  const tr = language === 'tr';

  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [dateFilterActive, setDateFilterActive] = useState(false);

  const [step, setStep] = useState(0);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [form, setForm] = useState<GuestForm>(emptyForm);
  const [showCorporate, setShowCorporate] = useState(false);
  const [isTurkish, setIsTurkish] = useState(true);
  const [showBirthPicker, setShowBirthPicker] = useState(false);

  // Step 2 — email check + account
  const [emailCheckState, setEmailCheckState] = useState<'idle' | 'checking' | 'exists' | 'not-exists'>('idle');
  const [wantsAccount, setWantsAccount] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [existingAccountVerified, setExistingAccountVerified] = useState(false);
  const [accountProfile, setAccountProfile] = useState<AccountProfile | null>(null);
  const [profileDecision, setProfileDecision] = useState<ProfileDecision | null>(null);
  const [passwordResetState, setPasswordResetState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  // Coupon (loyalty store / credit) — field is always available regardless of loyalty toggle.
  const [couponInput, setCouponInput] = useState('');
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newAccountProfileOwner, setNewAccountProfileOwner] = useState<NewAccountProfileOwner | null>(null);
  const [result, setResult] = useState<{ ok: boolean; confirmationId?: string; message?: string; needsProfileSetup?: boolean } | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentNow, setPaymentNow] = useState(() => Date.now());
  const finishingPaymentRef = useRef(false);
  const needsProfileSetupRef = useRef(false);

  const [savedPeople, setSavedPeople] = useState<AccountPerson[] | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const fetchRooms = useCallback(async (ci?: Date, co?: Date) => {
    setLoadingRooms(true);
    try {
      let url = '/api/public/rooms';
      if (ci && co) {
        const p = new URLSearchParams({
          checkIn:  dateKey(ci),
          checkOut: dateKey(co),
        });
        url = `/api/public/rooms?${p}`;
        setDateFilterActive(true);
      } else {
        setDateFilterActive(false);
      }
      const r = await fetch(url);
      const data = await r.json();
      if (data.ok) {
        const available = (data.rooms as RoomData[]).filter(r => !ci || !co || r.available);
        setRooms(available);
        // If selected room is no longer available, clear the selection
        setSelectedRoomId(prev => available.find(r => r.id === prev) ? prev : '');
      }
    } catch (e) { console.error(e); }
    finally { setLoadingRooms(false); }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  useEffect(() => {
    async function detectLogin() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.user) return;
        const peopleRes = await fetch('/api/account/people');
        const peopleData = await peopleRes.json();
        if (peopleData.ok && Array.isArray(peopleData.people) && peopleData.people.length > 0) {
          setSavedPeople(peopleData.people);
        }
      } catch { /* not logged in or network error */ }
    }
    detectLogin();
  }, []);

  // Returning from a top-level 3DS redirect: /?payment=<paymentId>. Fetch the
  // payment status and surface the themed confirmation (with QR) in-app.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('payment');
    if (!pid) return;

    params.delete('payment');
    const qs = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));

    (async () => {
      try {
        const res = await fetch(`/api/payments/${pid}/status`, { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        const paid = data?.ok && (data.payment?.status === 'paid' || data.reservation?.paymentStatus === 'paid');
        if (paid) {
          setResult({ ok: true, confirmationId: data.reservation?.confirmationId });
        } else {
          setResult({
            ok: false,
            message: tr
              ? 'Ödeme tamamlanamadı veya iptal edildi. Lütfen tekrar deneyin.'
              : 'Payment could not be completed or was cancelled. Please try again.',
          });
        }
      } catch {
        setResult({
          ok: false,
          message: tr ? 'Ödeme durumu alınamadı.' : 'Could not retrieve payment status.',
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRoom = rooms.find(r => r.id === selectedRoomId) ?? null;

  // Filter rooms by guest capacity in addition to date availability
  const capacityFilteredRooms = rooms.filter(r => {
    const maxA = r.maxAdults  ?? 99;
    const maxC = r.maxChildren ?? 99;
    return maxA >= form.adultsCount && (form.childrenCount === 0 || maxC >= form.childrenCount);
  });

  const nights = checkIn && checkOut
    ? Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000)
    : 0;

  const totalPrice = selectedRoom ? selectedRoom.basePrice * nights : 0;
  const discountedTotal = Math.max(0, totalPrice - couponDiscount);

  async function applyCoupon() {
    if (!couponInput.trim()) return;
    setCouponChecking(true);
    setCouponMsg(null);
    try {
      const r = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), subtotal: totalPrice }),
      });
      const d = await r.json().catch(() => null);
      if (r.status === 401) { setCouponMsg(tr ? 'Kupon kullanmak için giriş yapın.' : 'Log in to use a coupon.'); return; }
      if (d?.ok) { setCouponCode(d.code); setCouponDiscount(d.discount); setCouponMsg(null); }
      else { setCouponCode(null); setCouponDiscount(0); setCouponMsg(d?.message ?? (tr ? 'Geçersiz kupon.' : 'Invalid coupon.')); }
    } catch {
      setCouponMsg(tr ? 'Bağlantı hatası.' : 'Connection error.');
    } finally {
      setCouponChecking(false);
    }
  }

  function clearCoupon() {
    setCouponCode(null);
    setCouponDiscount(0);
    setCouponInput('');
    setCouponMsg(null);
  }

  const setField = useCallback(<K extends keyof GuestForm>(key: K, value: GuestForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  function selectPerson(person: AccountPerson) {
    setSelectedPersonId(person.id);
    const hasTc = !!(person.tcKimlikNo);
    setIsTurkish(hasTc || (!person.passportNo && (person.nationality === 'TR' || !person.nationality)));
    setForm(prev => ({
      ...prev,
      firstName:      person.firstName       || prev.firstName,
      lastName:       person.lastName        || prev.lastName,
      email:          person.email           || prev.email,
      phone:          person.phone           || prev.phone,
      birthDate:      person.birthDate       || prev.birthDate,
      gender:         person.gender          || prev.gender,
      nationality:    person.nationality     || prev.nationality,
      tcKimlikNo:     person.tcKimlikNo      || prev.tcKimlikNo,
      passportNo:     person.passportNo      || prev.passportNo,
      passportExpiry: person.passportExpiry  || prev.passportExpiry,
      companyName:    person.companyName     || prev.companyName,
      taxNumber:      person.taxNumber       || prev.taxNumber,
      taxOffice:      person.taxOffice       || prev.taxOffice,
    }));
  }

  function clearPersonSelection() {
    setSelectedPersonId(null);
    setForm(prev => ({ ...emptyForm, adultsCount: prev.adultsCount, childrenCount: prev.childrenCount }));
    setIsTurkish(true);
  }

  function formatDate(d: Date | null) {
    if (!d) return '';
    return d.toLocaleDateString(tr ? 'tr-TR' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Clear selected room if capacity exceeded after guest count change
  useEffect(() => {
    if (!selectedRoom) return;
    const maxA = selectedRoom.maxAdults  ?? 99;
    const maxC = selectedRoom.maxChildren ?? 99;
    if (form.adultsCount > maxA || (form.childrenCount > 0 && form.childrenCount > maxC)) {
      setSelectedRoomId('');
    }
  }, [form.adultsCount, form.childrenCount, selectedRoom]);

  // Step 0 validation
  const step0Valid = selectedRoomId && checkIn && checkOut && checkOut > checkIn;

  // Step 1 validation
  const step1Valid = form.firstName && form.lastName && form.email && form.phone &&
    (isTurkish ? form.tcKimlikNo.length === 11 : form.passportNo.length > 0);

  // Step 2 — account requires password match
  const mismatchLabels = getGuestProfileMismatchLabels(accountProfile, form, isTurkish, tr);
  const needsProfileDecision = existingAccountVerified && mismatchLabels.length > 0 && profileDecision === null;

  const step2BaseValid = emailCheckState === 'exists'
    ? loginPassword.length > 0 && !needsProfileDecision
    : wantsAccount === false || (
        wantsAccount === true &&
        password.length >= 8 &&
        password === passwordConfirm &&
        newAccountProfileOwner !== null
      );

  const step2Valid = kvkkAccepted && step2BaseValid;

  async function goToStep2() {
    setEmailCheckState('checking');
    setStep(2);
    setLoginPassword('');
    setLoginError(null);
    setExistingAccountVerified(false);
    setAccountProfile(null);
    setProfileDecision(null);
    setNewAccountProfileOwner(null);
    setPasswordResetState('idle');
    try {
      const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(form.email)}`);
      const data = await res.json();
      setEmailCheckState(data.exists ? 'exists' : 'not-exists');
    } catch {
      setEmailCheckState('not-exists');
    }
  }

  async function requestReservationPasswordReset() {
    setPasswordResetState('sending');
    setLoginError(null);

    try {
      const response = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await response.json().catch(() => null);

      setPasswordResetState(response.ok && data?.ok ? 'sent' : 'error');
    } catch {
      setPasswordResetState('error');
    }
  }

  async function finalizePaidReservation(session: PaymentSession) {
    if (finishingPaymentRef.current) return;
    finishingPaymentRef.current = true;
    try {
      // Account creation / guest-person add runs before payment (see
      // handleSubmit), so on success we only surface the confirmation. This
      // keeps the flow correct even when 3DS redirects the top window and the
      // in-memory form state is gone.
      setResult({
        ok: true,
        confirmationId: session.confirmationId,
        needsProfileSetup: needsProfileSetupRef.current,
      });
    } finally {
      finishingPaymentRef.current = false;
    }
  }

  async function refreshPaymentStatus(session: PaymentSession) {
    try {
      const response = await fetch(`/api/payments/${session.id}/status`, { cache: 'no-store' });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        setPaymentError(data?.message ?? (tr ? 'Ödeme durumu alınamadı.' : 'Could not fetch payment status.'));
        return;
      }

      if (data.payment?.status === 'paid' || data.reservation?.paymentStatus === 'paid') {
        await finalizePaidReservation({
          ...session,
          confirmationId: data.reservation?.confirmationId ?? session.confirmationId,
        });
        return;
      }

      if (data.reservation?.paymentStatus === 'expired' || data.payment?.status === 'expired') {
        setPaymentError(tr
          ? 'Ödeme süresi doldu. Lütfen rezervasyonu yeniden başlatın.'
          : 'Payment time expired. Please restart the reservation.');
        return;
      }

      if (data.payment?.status === 'failed') {
        setPaymentError(data.payment.errorMessage || (tr
          ? 'Ödeme tamamlanamadı. Aynı süre içinde tekrar deneyebilirsiniz.'
          : 'Payment could not be completed. You can try again within the hold period.'));
      }
    } catch {
      setPaymentError(tr ? 'Ödeme durumu kontrol edilemedi.' : 'Payment status could not be checked.');
    }
  }

  async function cancelPaymentAndEdit() {
    if (paymentSession) {
      await fetch(`/api/payments/${paymentSession.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      }).catch(() => null);
    }

    setPaymentSession(null);
    setPaymentError(null);
    setStep(2);
  }

  useEffect(() => {
    if (!paymentSession || result) return;
    const interval = window.setInterval(() => {
      setPaymentNow(Date.now());
      refreshPaymentStatus(paymentSession);
    }, 2500);

    return () => window.clearInterval(interval);
  }, [paymentSession, result]);

  useEffect(() => {
    if (!paymentSession) return;
    const activeSession = paymentSession;

    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; paymentId?: string; status?: string; message?: string } | null;
      if (!data || data.type !== 'garden-payment-callback' || data.paymentId !== activeSession.id) return;
      if (data.status === 'failed') {
        setPaymentError(data.message ?? (tr ? 'Ödeme tamamlanamadı.' : 'Payment could not be completed.'));
      }
      refreshPaymentStatus(activeSession);
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [paymentSession, tr]);

  async function handleSubmit(retryReservationId?: string) {
    if (!step0Valid || !step1Valid || !step2Valid) return;
    setSubmitting(true);
    setLoginError(null);
    setPaymentError(null);

    // Mevcut hesap varsa önce giriş doğrulaması yap
    let verifiedProfile = accountProfile;
    if (emailCheckState === 'exists') {
      if (!existingAccountVerified) {
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: loginPassword }),
        }).catch(() => null);
        const loginData = loginRes ? await loginRes.json().catch(() => null) : null;
        if (!loginData?.ok) {
          setLoginError(loginData?.message ?? (tr ? 'Şifre hatalı.' : 'Incorrect password.'));
          setSubmitting(false);
          return;
        }

        const profileRes = await fetch('/api/auth/me?profile=true').catch(() => null);
        const profileData = profileRes ? await profileRes.json().catch(() => null) : null;
        verifiedProfile = profileData?.user?.profile ?? null;
        setAccountProfile(verifiedProfile);
        setExistingAccountVerified(true);

        const labels = getGuestProfileMismatchLabels(verifiedProfile, form, isTurkish, tr);
        if (labels.length > 0) {
          setProfileDecision(null);
          setSubmitting(false);
          return;
        }
      }

      const labels = getGuestProfileMismatchLabels(verifiedProfile, form, isTurkish, tr);
      if (labels.length > 0 && profileDecision === null) {
        setSubmitting(false);
        return;
      }
    }

    const reservationForm = emailCheckState === 'exists' && profileDecision === 'account' && verifiedProfile
      ? formWithAccountProfile(form, verifiedProfile)
      : form;

    // Create the account / add the guest person BEFORE starting payment, so the
    // reservation links to the user and nothing depends on in-memory state
    // surviving a top-level 3DS redirect. Skipped on retry (already done).
    if (!retryReservationId) {
      if (emailCheckState === 'exists' && profileDecision === 'entered') {
        await fetch('/api/account/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            birthDate: form.birthDate || undefined,
            gender: form.gender || undefined,
            nationality: form.nationality || 'TR',
            tcKimlikNo: isTurkish ? form.tcKimlikNo : undefined,
            passportNo: !isTurkish ? form.passportNo : undefined,
            passportExpiry: !isTurkish ? form.passportExpiry : undefined,
            companyName: showCorporate ? form.companyName : undefined,
            taxNumber: showCorporate ? form.taxNumber : undefined,
            taxOffice: showCorporate ? form.taxOffice : undefined,
            relation: 'guest',
            isDefault: false,
          }),
        }).catch(() => null);
      }

      if (emailCheckState !== 'exists' && wantsAccount === true) {
        const registerRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            birthDate: form.birthDate || undefined,
            gender: form.gender || undefined,
            nationality: form.nationality || 'TR',
            tcKimlikNo: isTurkish ? form.tcKimlikNo : undefined,
            passportNo: !isTurkish ? form.passportNo : undefined,
            passportExpiry: !isTurkish ? form.passportExpiry : undefined,
            companyName: showCorporate ? form.companyName : undefined,
            taxNumber: showCorporate ? form.taxNumber : undefined,
            taxOffice: showCorporate ? form.taxOffice : undefined,
            password,
            profileOwner: newAccountProfileOwner ?? 'self',
          }),
        }).catch(() => null);
        const registerData = registerRes ? await registerRes.json().catch(() => null) : null;
        if (!registerData?.ok) {
          setPaymentError(registerData?.message ?? (tr ? 'Hesap oluşturulamadı.' : 'Account could not be created.'));
          setSubmitting(false);
          return;
        }
        needsProfileSetupRef.current = !!registerData.needsProfileSetup;
      }
    }

    const payload = {
      roomTypeId: selectedRoomId,
      checkInDate: dateKey(checkIn!),
      checkOutDate: dateKey(checkOut!),
      adultsCount: reservationForm.adultsCount,
      childrenCount: reservationForm.childrenCount,
      firstName: reservationForm.firstName,
      lastName: reservationForm.lastName,
      email: reservationForm.email,
      phone: reservationForm.phone,
      birthDate: reservationForm.birthDate || undefined,
      gender: reservationForm.gender || undefined,
      nationality: reservationForm.nationality || 'TR',
      tcKimlikNo: isTurkish ? reservationForm.tcKimlikNo : undefined,
      passportNo: !isTurkish ? reservationForm.passportNo : undefined,
      passportExpiry: !isTurkish ? reservationForm.passportExpiry : undefined,
      companyName: showCorporate ? reservationForm.companyName : undefined,
      taxNumber: showCorporate ? reservationForm.taxNumber : undefined,
      taxOffice: showCorporate ? reservationForm.taxOffice : undefined,
      specialRequests: reservationForm.specialRequests || undefined,
      kvkkAccepted,
      couponCode: couponCode || undefined,
      ...(retryReservationId ? { retryReservationId } : {}),
    };

    try {
      const resRes = await fetch('/api/reservations/payment-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resData = await resRes.json();

      if (!resData.ok) {
        setPaymentError(resData.message);
        setSubmitting(false);
        return;
      }

      // Coupon covered the whole amount → no payment step, reservation confirmed.
      if (resData.confirmed) {
        setResult({ ok: true, confirmationId: resData.confirmed.confirmationId, needsProfileSetup: needsProfileSetupRef.current });
        setSubmitting(false);
        return;
      }

      setPaymentSession(resData.payment);
      setPaymentNow(Date.now());
      setStep(3);
    } catch {
      setPaymentError(tr ? 'Bağlantı hatası.' : 'Connection error.');
    } finally {
      setSubmitting(false);
    }
  }

  const paymentRemainingMs = paymentSession?.expiresAt
    ? Math.max(0, new Date(paymentSession.expiresAt).getTime() - paymentNow)
    : 0;

  const paymentRemainingText = (() => {
    const totalSeconds = Math.ceil(paymentRemainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  })();

  // ── Result screen ──────────────────────────────────────────────────────────

  if (result) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-16 text-center">
        {result.ok ? (
          <>
            <div className="w-16 h-16 rounded-full bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center mb-5">
              <CheckCircle2 size={32} className="text-brand-accent" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {tr ? 'Ödeme Alındı, Rezervasyonunuz Onaylandı!' : 'Payment Received, Reservation Confirmed!'}
            </h2>
            <p className="text-white/50 text-sm mb-4">
              {tr ? 'Onay kodunuz:' : 'Your confirmation code:'}
            </p>
            {/* QR Code */}
            <div className="bg-white rounded-2xl p-4 mb-4 shadow-lg inline-block">
              <QRCodeImage
                value={result.confirmationId!}
                alt="QR"
                size={180}
                className="rounded-xl block"
              />
            </div>
            <div className="bg-brand-accent/10 border border-brand-accent/30 rounded-xl px-8 py-4 mb-4">
              <p className="text-brand-accent text-xl font-mono font-bold tracking-widest">
                {result.confirmationId}
              </p>
            </div>
            <p className="text-white/30 text-xs max-w-sm">
              {tr
                ? 'QR kodu veya onay kodunu resepsiyonda göstererek check-in yapabilirsiniz.'
                : 'Show the QR code or confirmation code at reception to check in.'}
            </p>
            {emailCheckState === 'exists' && (
              <p className="mt-4 text-xs text-brand-accent/70">
                {tr
                  ? 'Hesabınıza giriş yapıldı. Rezervasyonlarınızı panelden görebilirsiniz.'
                  : 'You are now logged in. View your reservations from your panel.'}
              </p>
            )}
            {emailCheckState !== 'exists' && wantsAccount === true && (
              <div className="mt-4 text-xs text-brand-accent/70 space-y-2">
                <p>
                  {result.needsProfileSetup
                    ? tr
                      ? 'Hesabınız oluşturuldu. Rezervasyon kişisini hesabınıza ekledik; kendi bilgilerinizi müşteri panelinde tamamlayabilirsiniz.'
                      : 'Your account has been created. We saved the reservation guest to your account; you can complete your own details in your panel.'
                    : tr
                      ? 'Hesabınız oluşturuldu ve bu bilgiler varsayılan profiliniz olarak kaydedildi.'
                      : 'Your account has been created and these details were saved as your default profile.'}
                </p>
                <button
                  type="button"
                  onClick={() => window.location.assign('/musteri')}
                  className="inline-flex rounded-lg bg-brand-accent px-4 py-2 text-[11px] font-bold text-black hover:bg-brand-accent/90 transition-colors"
                >
                  {tr ? 'Müşteri paneline git' : 'Go to customer panel'}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-5">
              <AlertCircle size={32} className="text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">
              {tr ? 'Bir Hata Oluştu' : 'An Error Occurred'}
            </h2>
            <p className="text-white/50 text-sm mb-6">{result.message}</p>
            <button
              onClick={() => setResult(null)}
              className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition-colors"
            >
              {tr ? 'Tekrar Dene' : 'Try Again'}
            </button>
          </>
        )}
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Left column — heading */}
      <div className="w-full lg:w-2/5 flex flex-col justify-center h-full space-y-3 shrink-0">
        <div>
          <div className="badge-accent mb-3">
            <Calendar size={12} />
            <span>{tr ? 'Rezervasyon' : 'Reservation'}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-[2.8rem] font-medium tracking-tighter leading-none text-white font-sans">
            {tr ? 'Konaklamanızı' : 'Book Your'}
            <br />
            {tr ? 'Hemen' : 'Stay'}
            <br />
            <span className="text-brand-accent">{tr ? 'Rezerve Edin' : 'Right Now'}</span>
          </h1>
        </div>

        {/* Summary card */}
        {selectedRoom && nights > 0 && (
          <div className="max-w-xs bg-black/15 backdrop-blur-md p-4 rounded-xl border border-white/5 space-y-2 shadow-lg">
            <p className="text-[10px] text-brand-accent uppercase tracking-widest font-semibold">
              {tr ? 'Seçilen Oda' : 'Selected Room'}
            </p>
            <p className="text-white font-bold">{selectedRoom.name}</p>
            <div className="text-xs text-white/50 space-y-0.5">
              <p>{formatDate(checkIn)} → {formatDate(checkOut)}</p>
              <p>{nights} {tr ? 'gece' : 'night'} × ₺{selectedRoom.basePrice.toLocaleString('tr-TR')}</p>
            </div>
            <p className="text-brand-accent font-bold text-sm">
              {tr ? 'Toplam:' : 'Total:'} ₺{totalPrice.toLocaleString('tr-TR')}
            </p>
          </div>
        )}
      </div>

      {/* Right column — form */}
      <div className="w-full lg:w-3/5 h-full flex flex-col min-h-0 py-2">
        <div className="bg-black/15 backdrop-blur-md rounded-2xl border border-white/5 p-4 shadow-lg flex flex-col min-h-0 flex-1">
          <StepBar step={step} />

          <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
          <AnimatePresence mode="wait">
            {/* ── Step 0: Room + Dates ─────────────────────────────────────── */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                <Field label={tr ? 'Oda Seçin' : 'Select Room'} required>
                  {dateFilterActive && (
                    <p className="text-[10px] text-brand-accent/70 mb-1 flex items-center gap-1">
                      <Check size={10} />
                      {tr ? 'Yalnızca seçili tarihlerde müsait odalar gösteriliyor' : 'Showing only rooms available for selected dates'}
                    </p>
                  )}
                  <div className="relative">
                    <select
                      value={selectedRoomId}
                      onChange={e => setSelectedRoomId(e.target.value)}
                      className={selectCls}
                      disabled={loadingRooms}
                    >
                      <option value="">
                        {loadingRooms
                          ? (tr ? 'Yükleniyor…' : 'Loading…')
                          : capacityFilteredRooms.length === 0
                            ? (tr ? 'Bu kişi sayısına ve tarihlere uygun oda yok' : 'No rooms available for these dates & guest count')
                            : (tr ? 'Oda seçin…' : 'Select a room…')}
                      </option>
                      {capacityFilteredRooms.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} · ₺{r.basePrice.toLocaleString('tr-TR')}/{tr ? 'gece' : 'night'}
                          {' · '}{r.maxAdults}{tr ? 'y' : 'a'}{r.maxChildren > 0 ? `+${r.maxChildren}${tr ? 'ç' : 'c'}` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  </div>
                </Field>

                {selectedRoom && (
                  <div className="bg-white/3 rounded-lg p-3 text-xs text-white/40 space-y-1">
                    <p className="text-brand-accent/70 font-medium">
                      {tr ? 'Kapasite:' : 'Capacity:'} {selectedRoom.maxAdults} {tr ? 'yetişkin' : 'adult'}
                      {selectedRoom.maxChildren > 0 ? ` + ${selectedRoom.maxChildren} ${tr ? 'çocuk' : 'child'}` : (tr ? ' (çocuk kabul edilmez)' : ' (no children)')}
                    </p>
                    {selectedRoom.description && <p>{selectedRoom.description}</p>}
                    {selectedRoom.roomType.amenities.length > 0 && (
                      <p>{selectedRoom.roomType.amenities.slice(0, 5).join(' · ')}{selectedRoom.roomType.amenities.length > 5 ? ' …' : ''}</p>
                    )}
                  </div>
                )}

                <Field label={tr ? 'Tarih Aralığı' : 'Date Range'} required>
                  <button
                    onClick={() => setShowDatePicker(true)}
                    className={`${inputCls} text-left flex items-center gap-2`}
                  >
                    <Calendar size={14} className="text-white/30 shrink-0" />
                    {checkIn && checkOut ? (
                      <span className="text-white">
                        {formatDate(checkIn)} → {formatDate(checkOut)}
                        <span className="ml-2 text-brand-accent/70 text-xs">({nights} {tr ? 'gece' : 'night'})</span>
                      </span>
                    ) : (
                      <span className="text-white/20">{tr ? 'Giriş ve çıkış tarihi seçin' : 'Select check-in & check-out'}</span>
                    )}
                  </button>
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label={tr ? 'Yetişkin' : 'Adults'} required>
                    <div className="relative">
                      <select value={form.adultsCount} onChange={e => setField('adultsCount', Number(e.target.value))} className={selectCls}>
                        {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                    </div>
                  </Field>
                  <Field label={tr ? 'Çocuk' : 'Children'}>
                    <div className="relative">
                      <select value={form.childrenCount} onChange={e => setField('childrenCount', Number(e.target.value))} className={selectCls}>
                        {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                    </div>
                  </Field>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    disabled={!step0Valid}
                    onClick={() => setStep(1)}
                    className="px-6 py-2.5 rounded-lg bg-brand-accent text-black font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-accent/90 transition-colors"
                  >
                    {tr ? 'Devam Et' : 'Continue'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 1: Guest Info ────────────────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {/* Saved People Quick-Select */}
                {savedPeople && savedPeople.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest">
                      {tr ? 'Kayıtlı Kişiler' : 'Saved Guests'}
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1 snap-x scrollbar-none">
                      {savedPeople.map(person => {
                        const selected = selectedPersonId === person.id;
                        const initials = ((person.firstName[0] ?? '') + (person.lastName[0] ?? '')).toUpperCase();
                        const relationLabel: Record<string, string> = {
                          self:    tr ? 'Kendim'  : 'Self',
                          guest:   tr ? 'Misafir' : 'Guest',
                          family:  tr ? 'Aile'    : 'Family',
                          company: tr ? 'Şirket'  : 'Company',
                        };
                        return (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => selected ? clearPersonSelection() : selectPerson(person)}
                            className={`snap-start shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border transition-all text-center min-w-[76px] ${
                              selected
                                ? 'border-brand-accent/50 bg-brand-accent/10'
                                : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                              selected ? 'bg-brand-accent/25 text-brand-accent' : 'bg-white/10 text-white/50'
                            }`}>
                              {selected ? <Check size={14} /> : initials}
                            </div>
                            <span className={`text-[11px] font-medium leading-tight max-w-[68px] truncate ${selected ? 'text-brand-accent' : 'text-white/70'}`}>
                              {person.firstName}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                              selected ? 'bg-brand-accent/20 text-brand-accent' : 'bg-white/8 text-white/30'
                            }`}>
                              {relationLabel[person.relation] ?? person.relation}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedPersonId ? (
                      <p className="text-[10px] text-brand-accent/60">
                        {tr ? 'Bilgiler otomatik dolduruldu — aşağıdan düzenleyebilirsiniz.' : 'Fields auto-filled — edit below if needed.'}
                      </p>
                    ) : (
                      <p className="text-[10px] text-white/25">
                        {tr ? 'Hızlı doldurmak için bir kişi seçin.' : 'Select a person to auto-fill the form.'}
                      </p>
                    )}
                    <div className="border-b border-white/8" />
                  </div>
                )}

                {/* Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label={tr ? 'Ad' : 'First Name'} required>
                    <input value={form.firstName} onChange={e => setField('firstName', e.target.value)} className={inputCls} placeholder="Ayşe" />
                  </Field>
                  <Field label={tr ? 'Soyad' : 'Last Name'} required>
                    <input value={form.lastName} onChange={e => setField('lastName', e.target.value)} className={inputCls} placeholder="Yılmaz" />
                  </Field>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="E-posta" required>
                    <div className="relative">
                      <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                      <input type="email" value={form.email} onChange={e => setField('email', e.target.value)} className={`${inputCls} pl-8`} placeholder="ayse@ornek.com" />
                    </div>
                  </Field>
                  <Field label={tr ? 'Telefon' : 'Phone'} required>
                    <PhoneInput
                      value={form.phone}
                      onChange={v => setField('phone', v)}
                    />
                  </Field>
                </div>

                {/* Birth + Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label={tr ? 'Doğum Tarihi' : 'Date of Birth'}>
                    <button
                      type="button"
                      onClick={() => setShowBirthPicker(true)}
                      className={`${inputCls} text-left flex items-center gap-2`}
                    >
                      <Calendar size={13} className="text-white/30 shrink-0" />
                      {form.birthDate ? (
                        <span className="text-white">
                          {new Date(form.birthDate + 'T12:00:00').toLocaleDateString(tr ? 'tr-TR' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </span>
                      ) : (
                        <span className="text-white/20">{tr ? 'Seçin…' : 'Select…'}</span>
                      )}
                    </button>
                  </Field>
                  <Field label={tr ? 'Cinsiyet' : 'Gender'}>
                    <div className="relative">
                      <select value={form.gender} onChange={e => setField('gender', e.target.value)} className={selectCls}>
                        <option value="">{tr ? 'Belirtmek istemiyorum' : 'Prefer not to say'}</option>
                        <option value="male">{tr ? 'Erkek' : 'Male'}</option>
                        <option value="female">{tr ? 'Kadın' : 'Female'}</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                    </div>
                  </Field>
                </div>

                {/* ID type toggle */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsTurkish(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isTurkish ? 'bg-brand-accent text-black' : 'bg-white/5 text-white/50 hover:text-white'}`}
                  >
                    {tr ? 'TC Vatandaşı' : 'Turkish Citizen'}
                  </button>
                  <button
                    onClick={() => setIsTurkish(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!isTurkish ? 'bg-brand-accent text-black' : 'bg-white/5 text-white/50 hover:text-white'}`}
                  >
                    {tr ? 'Yabancı Uyruklu' : 'Foreign National'}
                  </button>
                </div>

                {isTurkish ? (
                  <Field label="TC Kimlik No" required>
                    <TcInput
                      value={form.tcKimlikNo}
                      onChange={v => setField('tcKimlikNo', v)}
                      error={form.tcKimlikNo.length > 0 && form.tcKimlikNo.length < 11}
                    />
                    {form.tcKimlikNo.length > 0 && form.tcKimlikNo.length < 11 && (
                      <p className="text-[10px] text-red-400 mt-0.5">{tr ? '11 haneli olmalı' : 'Must be 11 digits'}</p>
                    )}
                  </Field>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={tr ? 'Pasaport No' : 'Passport No'} required>
                      <div className="relative">
                        <FileText size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                        <input value={form.passportNo} onChange={e => setField('passportNo', e.target.value.toUpperCase())} className={`${inputCls} pl-8`} placeholder="A12345678" />
                      </div>
                    </Field>
                    <Field label={tr ? 'Pasaport Son Geçerlilik' : 'Passport Expiry'}>
                      <input type="date" value={form.passportExpiry} onChange={e => setField('passportExpiry', e.target.value)} className={inputCls} />
                    </Field>
                  </div>
                )}

                {!isTurkish && (
                  <Field label={tr ? 'Uyruk' : 'Nationality'}>
                    <input value={form.nationality} onChange={e => setField('nationality', e.target.value.toUpperCase())} className={inputCls} placeholder="DE, FR, US…" maxLength={3} />
                  </Field>
                )}

                {/* Corporate toggle */}
                <button
                  onClick={() => setShowCorporate(p => !p)}
                  className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  <Building2 size={12} />
                  {showCorporate
                    ? (tr ? 'Kurumsal bilgileri kaldır' : 'Remove corporate info')
                    : (tr ? 'Kurumsal fatura bilgisi ekle' : 'Add corporate billing info')}
                </button>

                <AnimatePresence>
                  {showCorporate && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 pt-1">
                        <Field label={tr ? 'Şirket Adı' : 'Company Name'}>
                          <input value={form.companyName} onChange={e => setField('companyName', e.target.value)} className={inputCls} placeholder="Örnek A.Ş." />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Field label={tr ? 'Vergi No' : 'Tax Number'}>
                            <input value={form.taxNumber} onChange={e => setField('taxNumber', e.target.value)} className={inputCls} placeholder="1234567890" />
                          </Field>
                          <Field label={tr ? 'Vergi Dairesi' : 'Tax Office'}>
                            <input value={form.taxOffice} onChange={e => setField('taxOffice', e.target.value)} className={inputCls} placeholder="Kadıköy" />
                          </Field>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Special requests */}
                <Field label={tr ? 'Özel İstekler' : 'Special Requests'}>
                  <textarea
                    value={form.specialRequests}
                    onChange={e => setField('specialRequests', e.target.value)}
                    className={`${inputCls} resize-none h-20`}
                    placeholder={tr ? 'Erken check-in, bebek karyolası, vb.' : 'Early check-in, baby cot, etc.'}
                    maxLength={1000}
                  />
                </Field>

                <div className="flex justify-between pt-2">
                  <button onClick={() => setStep(0)} className="px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors">
                    {tr ? 'Geri' : 'Back'}
                  </button>
                  <button
                    disabled={!step1Valid}
                    onClick={goToStep2}
                    className="px-6 py-2.5 rounded-lg bg-brand-accent text-black font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-accent/90 transition-colors"
                  >
                    {tr ? 'Devam Et' : 'Continue'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Review + Account upsell ──────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-3"
              >
                {/* Summary */}
                <div className="bg-white/3 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-brand-accent font-semibold mb-3">
                    <BedDouble size={14} />
                    {tr ? 'Rezervasyon Özeti' : 'Reservation Summary'}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/50">
                    <span className="text-white/30">{tr ? 'Oda' : 'Room'}</span>
                    <span className="text-white">{selectedRoom?.name}</span>
                    <span className="text-white/30">{tr ? 'Giriş' : 'Check-in'}</span>
                    <span className="text-white">{formatDate(checkIn)}</span>
                    <span className="text-white/30">{tr ? 'Çıkış' : 'Check-out'}</span>
                    <span className="text-white">{formatDate(checkOut)}</span>
                    <span className="text-white/30">{tr ? 'Gece' : 'Nights'}</span>
                    <span className="text-white">{nights}</span>
                    <span className="text-white/30">{tr ? 'Misafir' : 'Guests'}</span>
                    <span className="text-white">{form.adultsCount} {tr ? 'yetişkin' : 'adult'}{form.childrenCount > 0 ? `, ${form.childrenCount} ${tr ? 'çocuk' : 'child'}` : ''}</span>
                    <span className="text-white/30">{tr ? 'İsim' : 'Name'}</span>
                    <span className="text-white">{form.firstName} {form.lastName}</span>
                  </div>
                  <div className="border-t border-white/5 mt-3 pt-3 flex justify-between text-sm">
                    <span className="text-white/40">{tr ? 'Toplam Tutar' : 'Total'}</span>
                    <span className="text-brand-accent font-bold text-base">₺{totalPrice.toLocaleString('tr-TR')}</span>
                  </div>

                  {/* Coupon — always available */}
                  <div className="border-t border-white/5 mt-3 pt-3 space-y-2">
                    <span className="label-sm font-mono text-white/40">{tr ? 'İndirim Kuponu' : 'Coupon'}</span>
                    {couponCode ? (
                      <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2">
                        <span className="text-xs text-emerald-300 font-mono">{couponCode} · −₺{couponDiscount.toLocaleString('tr-TR')}</span>
                        <button type="button" onClick={clearCoupon} className="text-white/40 hover:text-white text-[11px]">{tr ? 'Kaldır' : 'Remove'}</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          value={couponInput}
                          onChange={e => setCouponInput(e.target.value.toUpperCase())}
                          placeholder={tr ? 'Kupon kodu' : 'Coupon code'}
                          className="input-base text-xs flex-1 font-mono"
                        />
                        <button
                          type="button"
                          onClick={applyCoupon}
                          disabled={couponChecking || !couponInput.trim()}
                          className="px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold disabled:opacity-40 transition-colors"
                        >
                          {couponChecking ? '…' : (tr ? 'Uygula' : 'Apply')}
                        </button>
                      </div>
                    )}
                    {couponMsg && <p className="text-[10px] text-red-300">{couponMsg}</p>}
                    {couponCode && (
                      <div className="flex justify-between text-sm pt-1">
                        <span className="text-white/40">{tr ? 'İndirimli Toplam' : 'Discounted Total'}</span>
                        <span className="text-emerald-300 font-bold text-base">₺{discountedTotal.toLocaleString('tr-TR')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* E-posta kontrol ediliyor */}
                {emailCheckState === 'checking' && (
                  <div className="flex items-center gap-2 text-white/30 text-xs py-1">
                    <Loader2 size={12} className="animate-spin" />
                    {tr ? 'Hesap kontrol ediliyor…' : 'Checking account…'}
                  </div>
                )}

                {/* Mevcut hesap — giriş yap */}
                {emailCheckState === 'exists' && (
                  <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-brand-accent" />
                      <p className="text-sm font-semibold text-white">
                        {tr ? 'Bu e-posta ile bir hesabınız var' : 'You already have an account'}
                      </p>
                    </div>
                    <p className="text-xs text-white/40">
                      {tr
                        ? 'Rezervasyon hesabınıza bağlansın diye şifrenizi girin.'
                        : 'Enter your password to link this reservation to your account.'}
                    </p>
                    <Field label={tr ? 'Şifreniz' : 'Your Password'} required>
                      <input
                        type="password"
                        value={loginPassword}
                        onChange={e => {
                          setLoginPassword(e.target.value);
                          setLoginError(null);
                          setExistingAccountVerified(false);
                          setAccountProfile(null);
                          setProfileDecision(null);
                          setPasswordResetState('idle');
                        }}
                        onKeyDown={e => e.key === 'Enter' && step2Valid && !submitting && handleSubmit()}
                        className={inputCls}
                        placeholder="••••••••"
                        autoFocus
                      />
                    </Field>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={requestReservationPasswordReset}
                        disabled={passwordResetState === 'sending'}
                        className="text-[11px] text-brand-accent/70 hover:text-brand-accent disabled:opacity-50 transition-colors"
                      >
                        {passwordResetState === 'sending'
                          ? tr ? 'Bağlantı gönderiliyor…' : 'Sending link…'
                          : tr ? 'Şifremi unuttum' : 'Forgot password'}
                      </button>
                      {existingAccountVerified && !needsProfileDecision && (
                        <span className="text-[10px] text-emerald-300/80 flex items-center gap-1">
                          <Check size={11} />
                          {tr ? 'Hesap doğrulandı' : 'Account verified'}
                        </span>
                      )}
                    </div>
                    {passwordResetState === 'sent' && (
                      <p className="text-[10px] leading-relaxed text-emerald-300/80">
                        {tr
                          ? 'Bu e-posta kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu kontrol edebilirsiniz.'
                          : 'If this email is registered, a reset link has been sent. Please check your inbox.'}
                      </p>
                    )}
                    {passwordResetState === 'error' && (
                      <p className="text-[10px] text-red-400">
                        {tr ? 'Şu anda sıfırlama bağlantısı gönderilemedi.' : 'The reset link could not be sent right now.'}
                      </p>
                    )}
                    {loginError && (
                      <p className="text-[10px] text-red-400">{loginError}</p>
                    )}
                  </div>
                )}

                {emailCheckState === 'exists' && existingAccountVerified && mismatchLabels.length > 0 && (
                  <div className="rounded-xl border border-amber-300/25 bg-amber-400/10 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={15} className="text-amber-200 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-white">
                          {tr ? 'Bu rezervasyon farklı bir kişi için olabilir' : 'This stay may be for a different guest'}
                        </p>
                        <p className="text-xs leading-relaxed text-white/55">
                          {tr
                            ? `Hesabınızdaki bilgilerle rezervasyonda yazdıklarınız arasında ${mismatchLabels.join(', ')} alanında fark var. Aile üyesi, ekip arkadaşı ya da başka bir misafir için rezervasyon yapıyorsanız sorun yok; sadece nasıl kaydedelim seçin.`
                            : `Some details differ from your account profile: ${mismatchLabels.join(', ')}. If you are booking for a family member, colleague, or another guest, that is fine; just choose how we should save it.`}
                        </p>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setProfileDecision('entered')}
                        className={`rounded-lg px-3 py-2 text-left text-xs border transition-colors ${
                          profileDecision === 'entered'
                            ? 'bg-brand-accent text-black border-brand-accent'
                            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <span className="block font-semibold">
                          {tr ? 'Girilen kişi adına kalsın' : 'Keep entered guest'}
                        </span>
                        <span className={profileDecision === 'entered' ? 'text-black/60' : 'text-white/35'}>
                          {tr ? 'Rezervasyon bu kişiyle hesabınıza bağlanır.' : 'The reservation is linked to your account with this guest.'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfileDecision('account')}
                        className={`rounded-lg px-3 py-2 text-left text-xs border transition-colors ${
                          profileDecision === 'account'
                            ? 'bg-brand-accent text-black border-brand-accent'
                            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <span className="block font-semibold">
                          {tr ? 'Hesap bilgilerimi kullan' : 'Use my account details'}
                        </span>
                        <span className={profileDecision === 'account' ? 'text-black/60' : 'text-white/35'}>
                          {tr ? 'Rezervasyon hesabınızdaki kişiyle oluşturulur.' : 'The reservation will use your saved profile.'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Yeni kullanıcı — hesap oluşturmak ister misiniz? */}
                {emailCheckState === 'not-exists' && wantsAccount === null && (
                  <div className="bg-brand-accent/5 border border-brand-accent/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-brand-accent" />
                      <p className="text-sm font-semibold text-white">
                        {tr ? 'Üye olarak hızlı check-in yapmak ister misiniz?' : 'Want faster check-in with a member account?'}
                      </p>
                    </div>
                    <p className="text-xs text-white/40">
                      {tr
                        ? 'Bilgileriniz kaydedilir, bir sonraki rezervasyonda tekrar doldurmanıza gerek kalmaz.'
                        : 'Your info is saved so you don\'t need to re-enter it next time.'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setWantsAccount(true);
                          setNewAccountProfileOwner(null);
                        }}
                        className="flex-1 py-2 rounded-lg bg-brand-accent text-black text-xs font-bold hover:bg-brand-accent/90 transition-colors"
                      >
                        {tr ? 'Evet, hesap oluştur' : 'Yes, create account'}
                      </button>
                      <button
                        onClick={() => {
                          setWantsAccount(false);
                          setNewAccountProfileOwner(null);
                        }}
                        className="flex-1 py-2 rounded-lg bg-white/5 text-white/60 text-xs hover:bg-white/10 hover:text-white transition-colors"
                      >
                        {tr ? 'Hayır, devam et' : 'No, continue'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Password fields */}
                {wantsAccount === true && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <p className="text-xs text-brand-accent/70 flex items-center gap-1.5">
                      <Check size={11} />
                      {tr ? 'Şifrenizi belirleyin — hesabınız hazır!' : 'Set your password — account ready!'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label={tr ? 'Şifre (min. 8 karakter)' : 'Password (min. 8 chars)'} required>
                        <input
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className={inputCls}
                          placeholder="••••••••"
                        />
                      </Field>
                      <Field label={tr ? 'Şifre Tekrar' : 'Confirm Password'} required>
                        <input
                          type="password"
                          value={passwordConfirm}
                          onChange={e => setPasswordConfirm(e.target.value)}
                          className={inputCls}
                          placeholder="••••••••"
                        />
                      </Field>
                    </div>
                    {passwordConfirm && password !== passwordConfirm && (
                      <p className="text-[10px] text-red-400">{tr ? 'Şifreler eşleşmiyor.' : 'Passwords do not match.'}</p>
                    )}
                    {password.length >= 8 && password === passwordConfirm && (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                        <div className="flex items-start gap-2">
                          <User size={15} className="text-brand-accent mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {tr ? 'Bu bilgiler kime ait?' : 'Who are these details for?'}
                            </p>
                            <p className="text-xs text-white/45 leading-relaxed mt-1">
                              {tr
                                ? 'Hesabınızı doğru başlatmak için bunu bir kez soruyoruz. Rezervasyon sizin adınıza değilse sorun değil; bu kişiyi hesabınızda ayrı bir birey olarak saklarız.'
                                : 'We ask this once to set up your account correctly. If this stay is not for you, no problem; we will save this guest as a separate person in your account.'}
                            </p>
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setNewAccountProfileOwner('self')}
                            className={`rounded-lg px-3 py-2 text-left text-xs border transition-colors ${
                              newAccountProfileOwner === 'self'
                                ? 'bg-brand-accent text-black border-brand-accent'
                                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <span className="block font-semibold">
                              {tr ? 'Bana ait' : 'These are mine'}
                            </span>
                            <span className={newAccountProfileOwner === 'self' ? 'text-black/60' : 'text-white/35'}>
                              {tr ? 'Varsayılan profiliniz bu bilgilerle oluşur.' : 'Your default profile will use these details.'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewAccountProfileOwner('guest')}
                            className={`rounded-lg px-3 py-2 text-left text-xs border transition-colors ${
                              newAccountProfileOwner === 'guest'
                                ? 'bg-brand-accent text-black border-brand-accent'
                                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <span className="block font-semibold">
                              {tr ? 'Başka biri adına' : 'For someone else'}
                            </span>
                            <span className={newAccountProfileOwner === 'guest' ? 'text-black/60' : 'text-white/35'}>
                              {tr ? 'Bu kişi kart olarak kaydolur; kendi bilgilerinizi panelde tamamlarsınız.' : 'This guest is saved as a card; you can complete your own details later.'}
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => { setWantsAccount(null); setPassword(''); setPasswordConfirm(''); setNewAccountProfileOwner(null); setKvkkAccepted(false); }}
                      className="text-[10px] text-white/30 hover:text-white/50 transition-colors"
                    >
                      {tr ? 'Vazgeç, hesap istemiyorum' : 'Never mind, skip account'}
                    </button>
                  </motion.div>
                )}

                {wantsAccount === false && (
                  <p className="text-xs text-white/30 flex items-center gap-1.5">
                    <Check size={11} />
                    {tr ? 'Üyeliksiz devam ediyorsunuz.' : 'Continuing without an account.'}
                    <button onClick={() => setWantsAccount(null)} className="text-brand-accent/60 hover:text-brand-accent transition-colors ml-1">
                      {tr ? 'Değiştir' : 'Change'}
                    </button>
                  </p>
                )}

                <label className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kvkkAccepted}
                    onChange={e => setKvkkAccepted(e.target.checked)}
                    className="mt-0.5 shrink-0 accent-brand-accent"
                  />
                  <span>
                    {tr
                      ? 'Kişisel verilerimin Kütahya Garden Otel tarafından rezervasyon, ödeme ve iletişim amacıyla işlenmesini KVKK kapsamında kabul ediyorum.'
                      : 'I consent to Kütahya Garden Otel processing my personal data for reservation, payment and communication purposes (KVKK/GDPR).'}
                  </span>
                </label>

                {paymentError && (
                  <p className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-[11px] text-red-200">
                    {paymentError}
                  </p>
                )}

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => {
                      setStep(1);
                      setEmailCheckState('idle');
                      setLoginPassword('');
                      setLoginError(null);
                      setExistingAccountVerified(false);
                      setAccountProfile(null);
                      setProfileDecision(null);
                      setPasswordResetState('idle');
                    }}
                    className="px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
                  >
                    {tr ? 'Geri' : 'Back'}
                  </button>
                  <button
                    disabled={
                      submitting ||
                      !step2Valid ||
                      emailCheckState === 'checking' ||
                      emailCheckState === 'idle' ||
                      (emailCheckState === 'not-exists' && wantsAccount === null)
                    }
                    onClick={() => handleSubmit()}
                    className="px-6 py-2.5 rounded-lg bg-brand-accent text-black font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-accent/90 transition-colors flex items-center gap-2"
                  >
                    {submitting && <Loader2 size={14} className="animate-spin" />}
                    {tr ? 'Güvenli Ödemeye Geç' : 'Continue to Secure Payment'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Payment ───────────────────────────────────────────── */}
            {step === 3 && paymentSession && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="rounded-xl border border-brand-accent/20 bg-brand-accent/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-accent/15 border border-brand-accent/25 flex items-center justify-center text-brand-accent">
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {tr ? 'Güvenli ödeme' : 'Secure payment'}
                        </p>
                        <p className="text-xs text-white/45">
                          {tr ? 'Kart bilgileri iyzico güvenli alanında işlenir.' : 'Card details are processed inside iyzico secure checkout.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/10 px-3 py-2 text-xs text-white/70">
                      <Clock size={13} className="text-brand-accent" />
                      <span>{paymentRemainingText}</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">
                      {tr ? 'Ödenecek tutar' : 'Amount due'}
                    </p>
                    <p className="mt-1 text-xl font-bold text-brand-accent">
                      ₺{paymentSession.amount.toLocaleString('tr-TR')}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      {selectedRoom?.name} · {formatDate(checkIn)} → {formatDate(checkOut)}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/55">
                    <CreditCard size={14} />
                    iyzico
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
                  <IyzicoCheckoutForm
                    html={paymentSession.checkoutFormContent}
                    paymentPageUrl={paymentSession.paymentPageUrl}
                    tr={tr}
                  />
                </div>

                {paymentError && (
                  <div className="rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-xs text-red-100">
                    {paymentError}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={cancelPaymentAndEdit}
                    className="px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
                  >
                    {tr ? 'Bilgileri Düzenle' : 'Edit Details'}
                  </button>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => refreshPaymentStatus(paymentSession)}
                      className="px-5 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
                    >
                      {tr ? 'Durumu Kontrol Et' : 'Check Status'}
                    </button>
                    <button
                      type="button"
                      disabled={submitting || paymentRemainingMs <= 0}
                      onClick={() => handleSubmit(paymentSession.reservationId)}
                      className="px-5 py-2.5 rounded-lg bg-brand-accent text-black font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-accent/90 transition-colors flex items-center gap-2"
                    >
                      {submitting && <Loader2 size={14} className="animate-spin" />}
                      {tr ? 'Tekrar Dene' : 'Try Again'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Date picker modal */}
      <AnimatePresence>
        {showDatePicker && (
          <DatePickerModal
            checkIn={checkIn}
            checkOut={checkOut}
            roomTypeId={selectedRoom?.roomTypeId}
            roomName={selectedRoom?.name}
            onConfirm={(ci, co) => { setCheckIn(ci); setCheckOut(co); setShowDatePicker(false); fetchRooms(ci, co); }}
            onClose={() => setShowDatePicker(false)}
            tr={tr}
          />
        )}
      </AnimatePresence>

      {/* Birth date picker modal */}
      <AnimatePresence>
        {showBirthPicker && (
          <SingleDatePickerModal
            value={form.birthDate ? new Date(form.birthDate + 'T12:00:00') : null}
            maxDate={startOfDay(new Date())}
            onConfirm={d => {
              const yyyy = d.getFullYear();
              const mm   = String(d.getMonth() + 1).padStart(2, '0');
              const dd   = String(d.getDate()).padStart(2, '0');
              setField('birthDate', `${yyyy}-${mm}-${dd}`);
              setShowBirthPicker(false);
            }}
            onClose={() => setShowBirthPicker(false)}
            tr={tr}
            label={tr ? 'Doğum Tarihi' : 'Date of Birth'}
          />
        )}
      </AnimatePresence>
    </>
  );
}
