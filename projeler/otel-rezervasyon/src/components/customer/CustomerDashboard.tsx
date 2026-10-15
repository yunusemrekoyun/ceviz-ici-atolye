'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  LogOut, Calendar, User, Users, MessageSquare,
  BedDouble, Moon, Sun, Star, ChevronRight, Bell,
  Globe, Shield,
  ChevronDown, CheckCircle2, Building2, Home,
  Plus, IdCard, Save, MailCheck, X, Gift, Ticket, Loader2,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useTheme } from '@/theme/ThemeContext';
import { CustomerReservations } from '@/components/customer/CustomerReservations';
import { CustomerReviews } from '@/components/customer/CustomerReviews';
import type { AuthUser } from '@/lib/auth/session';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { BirthDateInput, formatBirthDate } from '@/components/ui/BirthDateInput';
import { TcInput, maskTc } from '@/components/ui/TcInput';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CustomerDashboardProps {
  user: AuthUser;
  authSource: 'access' | 'refresh';
}

type TabId = 'reservations' | 'reviews' | 'profile' | 'support';

interface AccountPerson {
  id: string;
  label: string | null;
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

// ── Loyalty helpers ────────────────────────────────────────────────────────────

const TIERS = [
  { id: 'bronze', labelTr: 'Bronz',  labelEn: 'Bronze',  minPts: 0,    color: 'text-amber-600',   bg: 'bg-amber-600/10',   border: 'border-amber-600/20'   },
  { id: 'silver', labelTr: 'Gümüş',  labelEn: 'Silver',  minPts: 2000, color: 'text-slate-300',   bg: 'bg-slate-400/10',   border: 'border-slate-400/20'   },
  { id: 'gold',   labelTr: 'Altın',  labelEn: 'Gold',    minPts: 5000, color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/20'  },
  { id: 'elite',  labelTr: 'Elite',  labelEn: 'Elite',   minPts: 10000,color: 'text-brand-accent', bg: 'bg-brand-accent/10',border: 'border-brand-accent/20'},
];

function getTier(pts: number) {
  return [...TIERS].reverse().find(t => pts >= t.minPts) ?? TIERS[0];
}

function getNextTier(pts: number) {
  return TIERS.find(t => t.minPts > pts) ?? null;
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({ email, size = 'lg' }: { email: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const initials = email.slice(0, 2).toUpperCase();
  const sz = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg', xl: 'w-20 h-20 text-2xl' }[size];
  return (
    <div className={`${sz} rounded-full bg-brand-accent/15 border-2 border-brand-accent/30 flex items-center justify-center font-bold text-brand-accent shrink-0`}>
      {initials}
    </div>
  );
}

// ── Profile Hero ───────────────────────────────────────────────────────────────

function ProfileHero({ user, tr, points, loyaltyEnabled }: { user: AuthUser; tr: boolean; points: number; loyaltyEnabled: boolean }) {
  const pts      = points;
  const tier     = getTier(pts);
  const nextTier = getNextTier(pts);
  const progress = nextTier ? Math.round(((pts - tier.minPts) / (nextTier.minPts - tier.minPts)) * 100) : 100;

  return (
    <div className="surface-panel overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
        {/* Avatar */}
        <Avatar email={user.email} size="xl" />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-xl font-bold text-main leading-none">
              {tr ? 'Hoş Geldiniz' : 'Welcome back'}
            </h1>
            {loyaltyEnabled && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${tier.bg} ${tier.border} ${tier.color}`}>
                <Star size={8} />
                {tr ? tier.labelTr : tier.labelEn}
              </span>
            )}
          </div>
          <p className="text-muted text-sm truncate mb-3">{user.email}</p>

          {/* Quick stats */}
          <div className="flex items-center gap-4 flex-wrap">
            {[
              { icon: BedDouble, value: '3',      label: tr ? 'Konaklama' : 'Stays' },
              { icon: Moon,      value: '8',       label: tr ? 'Gece'     : 'Nights' },
              ...(loyaltyEnabled ? [{ icon: Star, value: pts.toLocaleString('tr-TR'), label: tr ? 'Puan' : 'Points' }] : []),
            ].map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <Icon size={13} className="text-brand-accent/60" />
                <span className="text-sm font-bold text-main">{value}</span>
                <span className="text-xs text-subtle">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Loyalty progress (desktop) */}
        {loyaltyEnabled && nextTier && (
          <div className="hidden md:block w-48 shrink-0">
            <div className="flex justify-between text-[10px] text-subtle mb-1.5">
              <span>{tr ? tier.labelTr : tier.labelEn}</span>
              <span>{tr ? nextTier.labelTr : nextTier.labelEn}</span>
            </div>
            <div className="h-1.5 rounded-full bg-m-surface2 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-accent transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-subtle mt-1.5 text-right">
              {(nextTier.minPts - pts).toLocaleString('tr-TR')} {tr ? 'puan kaldı' : 'pts to go'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab Nav ────────────────────────────────────────────────────────────────────

const TABS: { id: TabId; labelTr: string; labelEn: string; icon: React.ElementType }[] = [
  { id: 'reservations', labelTr: 'Rezervasyonlarım', labelEn: 'My Stays',    icon: Calendar     },
  { id: 'reviews',      labelTr: 'Yorumlarım',       labelEn: 'Reviews',     icon: Star         },
  { id: 'profile',      labelTr: 'Profilim',         labelEn: 'Profile',     icon: User         },
  { id: 'support',      labelTr: 'Destek',           labelEn: 'Support',     icon: MessageSquare},
];

function TabNav({ active, setActive, tr }: { active: TabId; setActive: (t: TabId) => void; tr: boolean }) {
  return (
    <div className="tab-list no-scrollbar">
      {TABS.map(t => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`tab-item shrink-0 ${
              isActive
                ? 'tab-item-active'
                : ''
            }`}
          >
            <Icon size={13} />
            {tr ? t.labelTr : t.labelEn}
          </button>
        );
      })}
    </div>
  );
}

// ── Profile Tab ────────────────────────────────────────────────────────────────

const inputCls = 'control-base px-3 py-2.5 text-sm';

function PersonInfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] uppercase tracking-wider text-subtle">{label}</p>
      <p className="text-xs text-muted mt-0.5 break-words">{value || '—'}</p>
    </div>
  );
}

function PersonCard({ person, tr }: { person: AccountPerson; tr: boolean }) {
  const relationLabel = person.relation === 'self'
    ? tr ? 'Hesap sahibi' : 'Account owner'
    : tr ? 'Rezervasyon kişisi' : 'Reservation guest';

  return (
    <div className="surface-card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center shrink-0">
            <User size={17} className="text-brand-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-main truncate">{person.firstName} {person.lastName}</p>
            <p className="text-[11px] text-subtle">{person.label || relationLabel}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {person.isDefault && (
            <span className="rounded-full border border-brand-accent/25 bg-brand-accent/10 px-2 py-0.5 text-[9px] font-bold text-brand-accent">
              {tr ? 'Varsayılan' : 'Default'}
            </span>
          )}
          <span className="rounded-full border border-m-border bg-m-surface2 px-2 py-0.5 text-[9px] text-muted">
            {relationLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PersonInfoRow label="E-posta" value={person.email} />
        <PersonInfoRow label={tr ? 'Telefon' : 'Phone'} value={person.phone} />
        <PersonInfoRow label={tr ? 'Doğum tarihi' : 'Birth date'} value={formatBirthDate(person.birthDate, tr)} />
        <PersonInfoRow label={tr ? 'Uyruk' : 'Nationality'} value={person.nationality} />
        <PersonInfoRow label={tr ? 'T.C. kimlik no' : 'National ID'} value={person.tcKimlikNo ? maskTc(person.tcKimlikNo) : null} />
        <PersonInfoRow label={tr ? 'Pasaport no' : 'Passport no'} value={person.passportNo} />
        <PersonInfoRow label={tr ? 'Pasaport bitiş' : 'Passport expiry'} value={person.passportExpiry} />
        <PersonInfoRow label={tr ? 'Cinsiyet' : 'Gender'} value={person.gender} />
        <PersonInfoRow label={tr ? 'Şirket' : 'Company'} value={person.companyName} />
        <PersonInfoRow label={tr ? 'Vergi no' : 'Tax no'} value={person.taxNumber} />
      </div>
    </div>
  );
}

function ProfileTab({
  user,
  tr,
  people,
  onPeopleChanged,
}: {
  user: AuthUser;
  tr: boolean;
  people: AccountPerson[];
  onPeopleChanged: (people: AccountPerson[]) => void;
}) {
  const [ownerForm, setOwnerForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    birthDate: '',
    nationality: 'TR',
    tcKimlikNo: '',
  });
  const [savingOwner, setSavingOwner] = useState(false);
  const [ownerMessage, setOwnerMessage] = useState('');
  const [verifyHidden, setVerifyHidden] = useState(false);
  const [verifyState, setVerifyState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const hasDefaultOwner = people.some((person) => person.isDefault && person.relation === 'self');

  // Password change
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwStatus, setPwStatus] = useState<'idle' | 'saving' | 'ok' | 'err'>('idle');
  const [pwError, setPwError] = useState('');

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPw !== pwForm.confirm) {
      setPwError(tr ? 'Yeni şifreler eşleşmiyor.' : 'New passwords do not match.');
      return;
    }
    setPwStatus('saving');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw, confirmPassword: pwForm.confirm }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { setPwError(data?.message ?? (tr ? 'Hata.' : 'Error.')); setPwStatus('err'); return; }
      setPwStatus('ok');
      setPwForm({ current: '', newPw: '', confirm: '' });
      setTimeout(() => setPwStatus('idle'), 3000);
    } catch { setPwStatus('err'); setPwError(tr ? 'Bağlantı hatası.' : 'Network error.'); }
  }

  // Notification preferences
  const [prefs, setPrefs] = useState({ notifyReservationEmail: true, notifyCheckinEmail: true });

  useEffect(() => {
    fetch('/api/account/notification-preferences')
      .then(r => r.json())
      .then(d => { if (d.ok && d.prefs) setPrefs(d.prefs); })
      .catch(() => undefined);
  }, []);

  async function togglePref(key: 'notifyReservationEmail' | 'notifyCheckinEmail') {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await fetch('/api/account/notification-preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: next[key] }),
    }).catch(() => setPrefs(prefs));
  }

  async function resendVerification() {
    setVerifyState('sending');
    try {
      const response = await fetch('/api/auth/verify-email/resend', {
        method: 'POST',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => null);
      setVerifyState(response.ok && payload?.ok ? 'sent' : 'error');
    } catch {
      setVerifyState('error');
    }
  }

  async function saveOwnerProfile(event: FormEvent) {
    event.preventDefault();
    if (!ownerForm.firstName || !ownerForm.lastName || !ownerForm.phone) return;

    setSavingOwner(true);
    setOwnerMessage('');

    try {
      const response = await fetch('/api/account/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relation: 'self',
          isDefault: true,
          email: user.email,
          ...ownerForm,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.message || 'Profil kaydedilemedi.');
      }

      const list = await fetch('/api/account/people').then((res) => res.json()).catch(() => null);
      if (list?.ok) onPeopleChanged(list.people);
      setOwnerMessage(tr ? 'Bilgileriniz kaydedildi.' : 'Your details have been saved.');
      setOwnerForm({ firstName: '', lastName: '', phone: '', birthDate: '', nationality: 'TR', tcKimlikNo: '' });
    } catch (error) {
      setOwnerMessage(error instanceof Error ? error.message : (tr ? 'Bilgiler kaydedilemedi.' : 'Details could not be saved.'));
    } finally {
      setSavingOwner(false);
    }
  }

  return (
    <div className="space-y-4">
      {!user.emailVerified && !verifyHidden && (
        <div className="surface-card p-5 border-brand-accent/30 bg-brand-accent/8">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/12 border border-brand-accent/25 flex items-center justify-center shrink-0">
              <MailCheck size={18} className="text-brand-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-main">
                {tr ? 'E-posta adresinizi doğrulayın' : 'Verify your email address'}
              </h3>
              <p className="text-xs text-muted leading-relaxed mt-1">
                {tr
                  ? 'Profil ve güvenlik işlemlerinde hesabın size ait olduğundan emin olmak için e-postanızı doğrulamanızı öneririz.'
                  : 'We recommend verifying your email before profile and security changes so your account ownership is clear.'}
              </p>
              {verifyState === 'sent' && (
                <p className="text-xs text-brand-accent/80 mt-2">
                  {tr ? 'Doğrulama bağlantısı e-posta adresinize gönderildi.' : 'Verification link has been sent to your email.'}
                </p>
              )}
              {verifyState === 'error' && (
                <p className="text-xs text-red-300 mt-2">
                  {tr ? 'E-posta gönderilemedi. Daha sonra tekrar deneyin.' : 'Email could not be sent. Please try again later.'}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={resendVerification}
                  disabled={verifyState === 'sending'}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-xs font-bold text-black disabled:opacity-50"
                >
                  <MailCheck size={12} />
                  {verifyState === 'sending' ? (tr ? 'Gönderiliyor…' : 'Sending…') : (tr ? 'Hemen doğrula' : 'Verify now')}
                </button>
                <button
                  type="button"
                  onClick={() => setVerifyHidden(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-subtle hover:text-main"
                >
                  <X size={11} />
                  {tr ? 'Hayır teşekkürler' : 'No thanks'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="surface-panel p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-main flex items-center gap-2">
              <Users size={14} className="text-brand-accent" />
              {tr ? 'Hesaba Tanımlı Bireyler' : 'People on This Account'}
            </h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              {tr
                ? 'Kendiniz, aile üyeleriniz ya da adına rezervasyon yaptığınız kişiler burada kart olarak tutulur. Rezervasyon sırasında doğru kişiyi seçmek daha hızlı olur.'
                : 'You can keep yourself, family members, or guests you book for as cards here. It makes future reservations faster.'}
            </p>
          </div>
          <span className="rounded-full bg-m-surface2 border border-m-border px-2.5 py-1 text-[10px] text-muted">
            {people.length} {tr ? 'kayıt' : 'saved'}
          </span>
        </div>

        {!hasDefaultOwner && (
          <form onSubmit={saveOwnerProfile} className="rounded-xl border border-brand-accent/25 bg-brand-accent/8 p-4 mb-4 space-y-3">
            <div className="flex items-start gap-2">
              <IdCard size={15} className="text-brand-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-main">
                  {tr ? 'Kendi bilgilerinizi tamamlayın' : 'Complete your own details'}
                </p>
                <p className="text-xs text-muted leading-relaxed mt-1">
                  {tr
                    ? 'Rezervasyonu başka biri adına yaptıysanız onu zaten ekledik. Buraya kendi bilgilerinizi yazarsanız sonraki işlemlerde hesabın sahibi net görünür.'
                    : 'If you booked for someone else, we already saved that guest. Add your own details here so the account owner is clear next time.'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input className={inputCls} placeholder={tr ? 'Adınız' : 'First name'} value={ownerForm.firstName} onChange={(e) => setOwnerForm((p) => ({ ...p, firstName: e.target.value }))} />
              <input className={inputCls} placeholder={tr ? 'Soyadınız' : 'Last name'} value={ownerForm.lastName} onChange={(e) => setOwnerForm((p) => ({ ...p, lastName: e.target.value }))} />
              <PhoneInput
                value={ownerForm.phone}
                onChange={v => setOwnerForm(p => ({ ...p, phone: v }))}
              />
              <BirthDateInput
                value={ownerForm.birthDate}
                onChange={v => setOwnerForm(p => ({ ...p, birthDate: v }))}
                tr={tr}
              />
              <input className={inputCls} placeholder={tr ? 'Uyruk' : 'Nationality'} value={ownerForm.nationality} onChange={(e) => setOwnerForm((p) => ({ ...p, nationality: e.target.value }))} />
              <TcInput
                value={ownerForm.tcKimlikNo}
                onChange={v => setOwnerForm(p => ({ ...p, tcKimlikNo: v }))}
              />
            </div>
            {ownerMessage && <p className="text-xs text-brand-accent/80">{ownerMessage}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingOwner || !ownerForm.firstName || !ownerForm.lastName || !ownerForm.phone}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-xs font-bold text-black disabled:opacity-50"
              >
                <Save size={12} />
                {savingOwner ? (tr ? 'Kaydediliyor…' : 'Saving…') : (tr ? 'Bilgilerimi Kaydet' : 'Save My Details')}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {people.map((person) => (
            <PersonCard key={person.id} person={person} tr={tr} />
          ))}
          {people.length === 0 && (
            <div className="surface-card border-dashed p-5 text-center">
              <Plus size={18} className="mx-auto text-subtle mb-2" />
              <p className="text-sm text-muted">{tr ? 'Henüz kayıtlı birey yok.' : 'No saved people yet.'}</p>
              <p className="text-xs text-subtle mt-1">{tr ? 'İlk rezervasyon veya profil kaydıyla burası dolacak.' : 'This area fills after your first reservation or profile entry.'}</p>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handlePasswordChange} className="surface-panel p-5">
        <h3 className="text-sm font-semibold text-main mb-4 flex items-center gap-2">
          <Shield size={14} className="text-brand-accent" />
          {tr ? 'Güvenlik' : 'Security'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] text-subtle uppercase tracking-wider mb-1.5">
              {tr ? 'Mevcut Şifre' : 'Current Password'}
            </label>
            <input
              type="password"
              className={inputCls}
              placeholder="••••••••"
              value={pwForm.current}
              onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-[10px] text-subtle uppercase tracking-wider mb-1.5">
              {tr ? 'Yeni Şifre' : 'New Password'}
            </label>
            <input
              type="password"
              className={inputCls}
              placeholder="••••••••"
              value={pwForm.newPw}
              onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
              minLength={8}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] text-subtle uppercase tracking-wider mb-1.5">
              {tr ? 'Yeni Şifre (Tekrar)' : 'Confirm New Password'}
            </label>
            <input
              type="password"
              className={inputCls}
              placeholder="••••••••"
              value={pwForm.confirm}
              onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
              minLength={8}
              required
            />
          </div>
        </div>
        {pwError && <p className="text-xs text-red-400 mt-2">{pwError}</p>}
        {pwStatus === 'ok' && (
          <p className="text-xs text-emerald-400 mt-2">
            {tr ? 'Şifreniz güncellendi.' : 'Password updated.'}
          </p>
        )}
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={pwStatus === 'saving'}
            className="btn-secondary px-5 py-2 text-xs disabled:opacity-60"
          >
            {pwStatus === 'saving' ? '…' : (tr ? 'Şifreyi Güncelle' : 'Update Password')}
          </button>
        </div>
      </form>

      {/* Notifications */}
      <div className="surface-panel p-5">
        <h3 className="text-sm font-semibold text-main mb-4 flex items-center gap-2">
          <Bell size={14} className="text-brand-accent" />
          {tr ? 'Bildirim Tercihleri' : 'Notification Preferences'}
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">{tr ? 'Rezervasyon onayları (e-posta)' : 'Reservation confirmations (email)'}</span>
            <button
              type="button"
              onClick={() => togglePref('notifyReservationEmail')}
              className={`w-9 h-5 rounded-full relative transition-colors ${prefs.notifyReservationEmail ? 'bg-brand-accent' : 'bg-m-surface2'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${prefs.notifyReservationEmail ? 'left-4 bg-white' : 'left-0.5 bg-m-subtle'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">{tr ? 'Check-in hatırlatıcısı' : 'Check-in reminders'}</span>
            <button
              type="button"
              onClick={() => togglePref('notifyCheckinEmail')}
              className={`w-9 h-5 rounded-full relative transition-colors ${prefs.notifyCheckinEmail ? 'bg-brand-accent' : 'bg-m-surface2'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${prefs.notifyCheckinEmail ? 'left-4 bg-white' : 'left-0.5 bg-m-subtle'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between opacity-50">
            <span className="text-sm text-muted">{tr ? 'Kampanya ve fırsatlar' : 'Campaigns & offers'}</span>
            <div className="w-9 h-5 rounded-full relative cursor-not-allowed bg-m-surface2">
              <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-m-subtle" />
            </div>
          </div>
          <div className="flex items-center justify-between opacity-50">
            <span className="text-sm text-muted">{tr ? 'Yeni özellik duyuruları' : 'New feature announcements'}</span>
            <div className="w-9 h-5 rounded-full relative cursor-not-allowed bg-m-surface2">
              <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-m-subtle" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Support Tab ────────────────────────────────────────────────────────────────

const FAQ_TR = [
  { q: 'Check-in saati nedir?',       a: 'Standart check-in saatimiz 14:00\'tir. Erken check-in talep edebilirsiniz.' },
  { q: 'Check-out saati nedir?',      a: 'Standart check-out saatimiz 12:00\'dir. Geç check-out ek ücrete tabidir.' },
  { q: 'Rezervasyonumu nasıl iptal edebilirim?', a: '48 saat öncesine kadar ücretsiz iptal yapabilirsiniz.' },
  { q: 'Transfer hizmeti var mı?',    a: 'Evet, havalimanı transferi için resepsiyon ile iletişime geçin.' },
  { q: 'Ücretsiz Wi-Fi var mı?',     a: 'Tüm odalarda ve ortak alanlarda ücretsiz yüksek hızlı Wi-Fi mevcuttur.' },
];

const FAQ_EN = [
  { q: 'What is the check-in time?',        a: 'Standard check-in is at 14:00. Early check-in can be requested.' },
  { q: 'What is the check-out time?',       a: 'Standard check-out is at 12:00. Late check-out may incur additional charges.' },
  { q: 'How can I cancel my reservation?',  a: 'Free cancellation is available up to 48 hours before check-in.' },
  { q: 'Is transfer service available?',    a: 'Yes, please contact reception for airport transfer arrangements.' },
  { q: 'Is Wi-Fi free?',                   a: 'Yes, complimentary high-speed Wi-Fi is available in all rooms and common areas.' },
];

interface TicketItem {
  id: string;
  ticketId: string;
  category: string;
  message: string;
  createdAt: string;
  status?: string;
  adminReply?: string | null;
  repliedAt?: string | null;
}

interface ThreadMessage { id: string; sender: string; body: string; createdAt: string }

function TicketThread({ ticket, tr }: { ticket: TicketItem; tr: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [status, setStatus] = useState(ticket.status ?? 'open');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const d = await fetch(`/api/contact/${ticket.id}/messages`).then(r => r.json());
      if (d.ok) { setMessages(d.messages); setStatus(d.status); }
    } finally { setLoading(false); }
  }
  function toggle() { const next = !open; setOpen(next); if (next && messages.length === 0) load(); }

  async function send() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const d = await fetch(`/api/contact/${ticket.id}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: reply }),
      }).then(r => r.json());
      if (d.ok) { setMessages(prev => [...prev, d.message]); setReply(''); setStatus('open'); }
    } finally { setSending(false); }
  }
  async function setResolved(next: 'resolved' | 'open') {
    const d = await fetch(`/api/contact/${ticket.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }),
    }).then(r => r.json());
    if (d.ok) setStatus(next);
  }

  return (
    <div className="surface-card overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-m-hover transition-colors">
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-[10px] font-bold text-brand-accent">{ticket.ticketId}</span>
          <span className="text-[10px] text-subtle truncate">{ticket.category}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${status === 'resolved' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : 'text-amber-400 border-amber-500/20 bg-amber-500/10'}`}>
            {status === 'resolved' ? (tr ? 'Çözüldü' : 'Resolved') : (tr ? 'Açık' : 'Open')}
          </span>
          <ChevronDown size={13} className={`text-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-m-border">
          {loading ? (
            <div className="py-4 text-center"><Loader2 size={16} className="animate-spin text-subtle inline" /></div>
          ) : (
            <div className="space-y-1.5 pt-2 max-h-64 overflow-y-auto">
              {messages.map(m => (
                <div key={m.id} className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs ${m.sender === 'staff' ? 'bg-brand-accent/10 border border-brand-accent/15 text-muted' : 'bg-m-surface2 text-main ml-auto'}`}>
                  <p className="text-[8px] uppercase tracking-wider text-subtle mb-0.5">{m.sender === 'staff' ? (tr ? 'Otel' : 'Hotel') : (tr ? 'Siz' : 'You')}</p>
                  <p className="leading-relaxed whitespace-pre-wrap">{m.body}</p>
                </div>
              ))}
            </div>
          )}
          {status !== 'resolved' && (
            <div className="flex gap-2 pt-1">
              <input value={reply} onChange={e => setReply(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} placeholder={tr ? 'Yanıt yaz…' : 'Reply…'} className="control-base px-2.5 py-1.5 text-xs flex-1" />
              <button onClick={send} disabled={sending || !reply.trim()} className="btn-primary px-3 text-xs disabled:opacity-50">{sending ? '…' : (tr ? 'Gönder' : 'Send')}</button>
            </div>
          )}
          <div className="flex justify-end pt-0.5">
            {status === 'resolved'
              ? <button onClick={() => setResolved('open')} className="text-[10px] text-subtle hover:text-main">{tr ? 'Yeniden aç' : 'Reopen'}</button>
              : <button onClick={() => setResolved('resolved')} className="text-[10px] text-emerald-400 hover:underline">{tr ? 'Çözüldü olarak işaretle' : 'Mark resolved'}</button>}
          </div>
        </div>
      )}
    </div>
  );
}

const CATEGORIES_TR = ['Rezervasyon hakkında', 'Check-in / Check-out', 'Oda sorunu', 'Yemek ve servis', 'Diğer'];
const CATEGORIES_EN = ['About a reservation', 'Check-in / Check-out', 'Room issue', 'Food and service', 'Other'];

function SupportTab({ tr, user }: { tr: boolean; user: AuthUser }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const faqs = tr ? FAQ_TR : FAQ_EN;
  const categories = tr ? CATEGORIES_TR : CATEGORIES_EN;

  const [category, setCategory] = useState(categories[0]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastTicket, setLastTicket] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [ticketsLoaded, setTicketsLoaded] = useState(false);

  const loadTickets = useCallback(() => {
    fetch('/api/contact')
      .then(r => r.json())
      .then(d => { if (d.ok) setTickets(d.requests); })
      .catch(() => undefined)
      .finally(() => setTicketsLoaded(true));
  }, []);
  useEffect(() => { loadTickets(); }, [loadTickets]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user.email.split('@')[0], category, message }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setLastTicket(data.ticketId);
        setMessage('');
        setCategory(categories[0]);
        loadTickets();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Contact card */}
      <div className="surface-panel p-5 border-brand-accent/20 bg-brand-accent/10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white overflow-hidden shrink-0 shadow-sm">
            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" style={{ objectPosition: 'left center' }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-main">Kütahya Garden Otel</p>
            <p className="text-[11px] text-subtle">{tr ? 'Resepsiyon — 7/24 hizmetinizde' : 'Reception — Available 24/7'}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
          {[
            { icon: Globe,         label: tr ? 'Web Sitesi' : 'Website', value: 'gardenhotel.com',      cls: 'text-brand-accent' },
            { icon: MessageSquare, label: tr ? 'E-posta'    : 'Email',   value: 'info@gardenhotel.com', cls: 'text-muted' },
            { icon: Bell,          label: tr ? 'Telefon'    : 'Phone',   value: '+90 (212) 000 00 00',  cls: 'text-muted' },
          ].map(c => (
            <div key={c.label} className="surface-card p-3">
              <c.icon size={13} className={`${c.cls} mb-1.5`} />
              <p className="text-[9px] text-subtle uppercase tracking-wider">{c.label}</p>
              <p className={`text-xs font-medium mt-0.5 ${c.cls}`}>{c.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Success banner */}
      {lastTicket && (
        <div className="surface-panel p-4 border-emerald-500/20 bg-emerald-500/5 flex items-start gap-3">
          <MailCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">
              {tr ? 'Talebiniz alındı' : 'Request received'}
            </p>
            <p className="text-xs text-muted mt-0.5">
              {tr ? `Bilet no: ${lastTicket}` : `Ticket: ${lastTicket}`}
              {tr ? ' — Ekibimiz en kısa sürede dönecektir.' : ' — Our team will respond shortly.'}
            </p>
          </div>
          <button onClick={() => setLastTicket(null)} className="ml-auto text-subtle hover:text-main">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Message form */}
      <form onSubmit={handleSubmit} className="surface-panel p-5">
        <h3 className="text-sm font-semibold text-main mb-4 flex items-center gap-2">
          <MessageSquare size={14} className="text-brand-accent" />
          {tr ? 'Mesaj Gönder' : 'Send a Message'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] text-subtle uppercase tracking-wider mb-1.5">
              {tr ? 'Konu' : 'Subject'}
            </label>
            <select
              className={`${inputCls} appearance-none`}
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-subtle uppercase tracking-wider mb-1.5">
              {tr ? 'Mesajınız' : 'Your message'}
            </label>
            <textarea
              className={`${inputCls} resize-none h-24`}
              placeholder={tr ? 'Mesajınızı buraya yazın…' : 'Type your message here…'}
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={submitting || !message.trim()}
            className="btn-primary px-5 py-2 text-xs disabled:opacity-60"
          >
            {submitting ? '…' : (tr ? 'Gönder' : 'Send')}
          </button>
        </div>
      </form>

      {/* Ticket history */}
      {ticketsLoaded && tickets.length > 0 && (
        <div className="surface-panel p-5">
          <h3 className="text-sm font-semibold text-main mb-4 flex items-center gap-2">
            <ChevronRight size={14} className="text-brand-accent" />
            {tr ? 'Taleplerim' : 'My Tickets'}
          </h3>
          <div className="space-y-2">
            {tickets.map(t => (
              <TicketThread key={t.id} ticket={t} tr={tr} />
            ))}
          </div>
        </div>
      )}

      {/* FAQ */}
      <div className="surface-panel p-5">
        <h3 className="text-sm font-semibold text-main mb-4">{tr ? 'Sık Sorulan Sorular' : 'FAQ'}</h3>
        <div className="space-y-2">
          {faqs.map((f, i) => (
            <div key={i} className="border border-m-border rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm text-muted hover:text-main hover:bg-m-hover transition-colors"
              >
                <span>{f.q}</span>
                <ChevronDown
                  size={14}
                  className={`shrink-0 text-subtle transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-3 text-sm text-muted leading-relaxed">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Loyalty panel (real points + coupons + store) ──────────────────────────────

interface LoyaltyCoupon {
  id: string; code: string; kind: string; discountType: string; value: number;
  minSpend: number; maxDiscount: number | null; balance: number | null;
  expiresAt: string | null; sourceLabel: string | null;
}
interface LoyaltyProduct {
  id: string; name: string; pointsCost: number; discountType: string; value: number;
  minSpend: number; maxDiscount: number | null; expiresInDays: number | null;
}
interface LoyaltyData {
  enabled: boolean; points: number; coupons: LoyaltyCoupon[]; products: LoyaltyProduct[];
}

function discountText(d: { discountType: string; value: number; balance: number | null }, tr: boolean) {
  if (d.discountType === 'percent') return `%${d.value} ${tr ? 'indirim' : 'off'}`;
  return `₺${(d.balance ?? d.value).toLocaleString('tr-TR')} ${tr ? 'indirim' : 'off'}`;
}

function LoyaltyPanel({ tr, data, onChanged }: { tr: boolean; data: LoyaltyData; onChanged: () => void }) {
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function buy(id: string) {
    setBuyingId(id);
    setNotice(null);
    try {
      const r = await fetch('/api/account/loyalty/purchase', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: id }),
      });
      const d = await r.json();
      if (d.ok) { setNotice(tr ? 'Kupon hesabınıza eklendi.' : 'Coupon added to your account.'); onChanged(); }
      else setNotice(d.message ?? (tr ? 'Satın alınamadı.' : 'Could not purchase.'));
    } catch {
      setNotice(tr ? 'Bağlantı hatası.' : 'Connection error.');
    } finally {
      setBuyingId(null);
    }
  }

  function copy(code: string) {
    navigator.clipboard?.writeText(code).then(() => { setCopied(code); setTimeout(() => setCopied(null), 1500); }).catch(() => null);
  }

  return (
    <div className="surface-panel p-5 space-y-4">
      {/* Points */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-brand-accent/10 border border-brand-accent/25 flex items-center justify-center">
          <Star size={20} className="text-brand-accent" />
        </div>
        <div>
          <p className="text-2xl font-black text-main leading-none tabular-nums">{data.points.toLocaleString('tr-TR')}</p>
          <p className="text-[11px] text-subtle mt-0.5">{tr ? 'Sadakat Puanı' : 'Loyalty Points'}</p>
        </div>
      </div>

      {/* My coupons */}
      <div>
        <p className="text-[10px] text-subtle uppercase tracking-widest mb-2 flex items-center gap-1.5"><Ticket size={11} /> {tr ? 'Kuponlarım' : 'My Coupons'}</p>
        {data.coupons.length === 0 ? (
          <p className="text-[11px] text-subtle">{tr ? 'Aktif kuponunuz yok.' : 'No active coupons.'}</p>
        ) : (
          <div className="space-y-1.5">
            {data.coupons.map(c => (
              <button key={c.id} onClick={() => copy(c.code)} title={tr ? 'Kopyala' : 'Copy'}
                className="w-full text-left rounded-lg border border-brand-accent/20 bg-brand-accent/5 px-3 py-2 hover:bg-brand-accent/10 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-brand-accent">{c.code}</span>
                  <span className="text-[10px] text-subtle">{copied === c.code ? (tr ? 'Kopyalandı!' : 'Copied!') : discountText(c, tr)}</span>
                </div>
                <p className="text-[10px] text-subtle mt-0.5">
                  {c.kind === 'credit' ? (tr ? 'Kredi kuponu' : 'Credit') : (c.sourceLabel ?? (tr ? 'Kupon' : 'Coupon'))}
                  {c.minSpend > 0 && ` · min ₺${c.minSpend.toLocaleString('tr-TR')}`}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Store */}
      <div className="border-t border-m-border pt-3">
        <p className="text-[10px] text-subtle uppercase tracking-widest mb-2 flex items-center gap-1.5"><Gift size={11} /> {tr ? 'Puan Mağazası' : 'Points Store'}</p>
        {data.products.length === 0 ? (
          <p className="text-[11px] text-subtle">{tr ? 'Şu an satışta kupon yok.' : 'No coupons available.'}</p>
        ) : (
          <div className="space-y-2">
            {data.products.map(p => {
              const affordable = data.points >= p.pointsCost;
              return (
                <div key={p.id} className="rounded-lg border border-m-border bg-m-surface px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-main">{p.name}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-accent"><Star size={9} />{p.pointsCost}</span>
                  </div>
                  <p className="text-[10px] text-subtle mt-0.5">
                    {discountText({ discountType: p.discountType, value: p.value, balance: null }, tr)}
                    {p.minSpend > 0 && ` · min ₺${p.minSpend.toLocaleString('tr-TR')}`}
                  </p>
                  <button
                    onClick={() => buy(p.id)}
                    disabled={!affordable || buyingId === p.id}
                    className="mt-2 w-full py-1.5 rounded-lg text-[11px] font-semibold transition-colors disabled:opacity-40 bg-brand-accent text-brand-emerald hover:brightness-105 disabled:bg-m-surface2 disabled:text-subtle"
                  >
                    {buyingId === p.id ? '…' : affordable ? (tr ? 'Satın Al' : 'Buy') : (tr ? 'Yetersiz puan' : 'Not enough points')}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {notice && <p className="text-[11px] text-brand-accent">{notice}</p>}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function CustomerDashboard({ user, authSource }: CustomerDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, setLanguage } = useLanguage();
  const { mode, setMode } = useTheme();
  const tr = language === 'tr';
  const [activeTab, setActiveTab] = useState<TabId>('reservations');
  const [loggingOut, setLoggingOut] = useState(false);
  const [people, setPeople] = useState<AccountPerson[]>([]);
  const [peopleLoaded, setPeopleLoaded] = useState(false);
  const [showProfileSetupPrompt, setShowProfileSetupPrompt] = useState(false);
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);

  const fetchLoyalty = useCallback(async () => {
    const d = await fetch('/api/account/loyalty').then(r => r.json()).catch(() => null);
    if (d?.ok) setLoyalty({ enabled: d.enabled, points: d.points, coupons: d.coupons, products: d.products });
  }, []);
  useEffect(() => { fetchLoyalty(); }, [fetchLoyalty]);

  useEffect(() => {
    if (searchParams.get('tab') === 'reviews') {
      setActiveTab('reviews');
    }
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/account/people')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setPeople(data.people);
          const hasDefaultOwner = (data.people as AccountPerson[]).some((person) => person.isDefault && person.relation === 'self');
          if (!hasDefaultOwner) setShowProfileSetupPrompt(true);
        }
      })
      .catch(() => undefined)
      .finally(() => setPeopleLoaded(true));
  }, []);

  const toggleMode = () => {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await fetch('/api/auth/logout', { method: 'POST' }); }
    finally { router.replace('/'); router.refresh(); }
  };

  return (
    <div data-mode={mode} className={`min-h-dvh panel-root${mode === 'light' ? ' mode-light' : ''}`}>
      <AnimatePresence>
        {peopleLoaded && showProfileSetupPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22 }}
              className="w-full max-w-md modal-shell p-5"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand-accent/10 border border-brand-accent/25 flex items-center justify-center shrink-0">
                  <IdCard size={18} className="text-brand-accent" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-main">
                    {tr ? 'Hesabınızı tamamlayalım' : 'Let’s complete your account'}
                  </h2>
                  <p className="text-sm text-muted leading-relaxed mt-2">
                    {tr
                      ? 'Rezervasyon kişisini kaydettik. Hesap sahibi olarak kendi bilgilerinizi de eklerseniz sonraki rezervasyonlarda kimin adına işlem yaptığınızı daha rahat seçersiniz.'
                      : 'We saved the reservation guest. Add your own details as the account owner so future bookings are easier to manage.'}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => {
                    setShowProfileSetupPrompt(false);
                    setActiveTab('profile');
                  }}
                  className="btn-primary flex-1 rounded-lg px-4 py-2.5 text-xs"
                >
                  {tr ? 'Bilgilerimi ekle' : 'Add my details'}
                </button>
                <button
                  onClick={() => setShowProfileSetupPrompt(false)}
                  className="btn-secondary flex-1 px-4 py-2.5 text-xs"
                >
                  {tr ? 'Sonra yaparım' : 'I’ll do it later'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Minimal top bar */}
      <header className="topbar-glass">
        <div className="max-w-6xl mx-auto px-4 h-10 w-full flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-white overflow-hidden shrink-0 shadow-sm">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" style={{ objectPosition: 'left center' }} />
            </div>
            <span className="text-sm font-bold text-main">Kütahya Garden Otel</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/')}
              className="btn-secondary h-8 px-2.5 text-[10px]"
            >
              <Home size={11} />
              <span className="hidden sm:inline">{tr ? 'Ana Sayfa' : 'Home'}</span>
            </button>
            <button
              onClick={toggleMode}
              className="btn-secondary h-8 px-2.5 text-[10px]"
            >
              {mode === 'dark' ? <Sun size={11} /> : <Moon size={11} />}
              {mode === 'dark' ? (tr ? 'Açık' : 'Light') : (tr ? 'Koyu' : 'Dark')}
            </button>
            <button
              onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
              className="btn-secondary h-8 px-2.5 text-[10px]"
            >
              {language.toUpperCase()}
            </button>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="btn-secondary h-8 px-3 text-xs"
            >
              <LogOut size={12} />
              {loggingOut ? '…' : (tr ? 'Çıkış' : 'Sign out')}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        {/* Hero */}
        <ProfileHero user={user} tr={tr} points={loyalty?.points ?? 0} loyaltyEnabled={loyalty?.enabled ?? false} />

        {/* Two-column layout: tabs+content left, loyalty right (only when enabled) */}
        <div className={`grid grid-cols-1 gap-5 items-start ${loyalty?.enabled ? 'lg:grid-cols-[minmax(0,1fr)_20rem]' : ''}`}>
          {/* Left: tabs + content */}
          <div className="flex-1 min-w-0 space-y-4">
            <TabNav active={activeTab} setActive={setActiveTab} tr={tr} />

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {activeTab === 'reservations' && <CustomerReservations user={user} tr={tr} />}
                {activeTab === 'reviews'      && <CustomerReviews user={user} tr={tr} focusConfirmationId={searchParams.get('reservation')} />}
                {activeTab === 'profile'      && <ProfileTab user={user} tr={tr} people={people} onPeopleChanged={setPeople} />}
                {activeTab === 'support'      && <SupportTab tr={tr} user={user} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: loyalty panel (sticky) — only when the program is enabled */}
          {loyalty?.enabled && (
            <div className="w-full lg:sticky lg:top-20">
              <LoyaltyPanel tr={tr} data={loyalty} onChanged={fetchLoyalty} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
