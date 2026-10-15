'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, UserRound, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { ScreenHeader } from '../ScreenHeader';

interface Me {
  email: string;
  roleSlug: string;
  firstName?: string | null;
}

// Profile — not in the PDF; wires the existing auth (login / account / logout).
export function MobileProfile() {
  const { language } = useLanguage();
  const tr = language === 'tr';
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const refresh = () =>
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setMe(d?.ok ? d.user : null))
      .catch(() => setMe(null))
      .finally(() => setLoaded(true));

  useEffect(() => {
    refresh();
  }, []);

  async function login(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        setError(d?.message ?? (tr ? 'Giriş başarısız.' : 'Login failed.'));
        return;
      }
      setEmail('');
      setPassword('');
      await refresh();
    } catch {
      setError(tr ? 'Bağlantı hatası.' : 'Connection error.');
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setMe(null);
  }

  if (!loaded) {
    return <p className="px-4 py-12 text-center font-hotel text-sm text-hotel-text-muted">…</p>;
  }

  // ── Logged in ──
  if (me) {
    const name = me.firstName || me.email.split('@')[0];
    const initials = (me.firstName ? me.firstName[0] : me.email[0]).toUpperCase();
    return (
      <div className="space-y-6 px-4 py-6">
        <div className="flex flex-col items-center gap-3 pt-4">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-hotel-peach font-serif text-2xl font-bold text-hotel-bg shadow-lg shadow-hotel-peach/20">
            {initials}
          </span>
          <div className="text-center">
            <p className="font-serif text-2xl font-bold text-hotel-text-primary">
              {tr ? `Merhaba, ${name}` : `Hello, ${name}`}
            </p>
            <p className="font-hotel text-sm text-hotel-text-muted">{me.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/${me.roleSlug === 'musteri' ? 'musteri' : me.roleSlug}`)}
          className="card-hotel flex w-full items-center gap-4 p-5 text-left"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-hotel-peach/30 bg-hotel-peach/15">
            <UserRound size={20} className="text-hotel-peach" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg font-bold text-hotel-text-primary">
              {tr ? 'Hesabım & Rezervasyonlarım' : 'Account & Reservations'}
            </p>
            <p className="font-hotel text-sm text-hotel-text-muted">
              {tr ? 'Konaklamalar, profil, destek' : 'Stays, profile, support'}
            </p>
          </div>
          <ChevronRight size={20} className="shrink-0 text-hotel-text-muted" />
        </button>

        <button type="button" onClick={logout} className="btn-hotel-outline w-full">
          <LogOut size={18} />
          {tr ? 'Çıkış Yap' : 'Sign Out'}
        </button>
      </div>
    );
  }

  // ── Logged out → login ──
  return (
    <div className="space-y-6 px-4 py-6">
      <div className="space-y-2.5">
        <ScreenHeader eyebrow={tr ? 'Hesap' : 'Account'} title={tr ? 'Giriş Yap' : 'Sign In'} />
        <p className="max-w-xs font-hotel text-sm text-hotel-text-muted">
          {tr ? 'Rezervasyonlarını ve hesabını görmek için giriş yap.' : 'Sign in to view your reservations and account.'}
        </p>
      </div>

      <form onSubmit={login} className="card-hotel space-y-4 p-5">
        <input
          type="email"
          className="input-hotel"
          placeholder={tr ? 'E-posta' : 'Email'}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="input-hotel"
          placeholder={tr ? 'Şifre' : 'Password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="font-hotel text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={submitting || !email || !password} className="btn-hotel disabled:opacity-40">
          {submitting ? '…' : `${tr ? 'Giriş Yap' : 'Sign In'} →`}
        </button>
      </form>

      <p className="text-center font-hotel text-xs text-hotel-text-muted">
        {tr
          ? 'Hesabın yok mu? Rezervasyon yaparken otomatik oluşturulur.'
          : 'No account? One is created automatically when you book.'}
      </p>
    </div>
  );
}
