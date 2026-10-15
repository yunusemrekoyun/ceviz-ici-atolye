'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { Palette, ChevronLeft, ChevronRight, CreditCard, Bell, Server, CheckCircle2, Clock, Loader2, Ban, Smartphone, ShieldCheck, AlertTriangle, RotateCw } from 'lucide-react';
import { useTheme, THEMES } from '@/theme/ThemeContext';

// ── Types ─────────────────────────────────────────────────────────────────────

type View = 'main' | 'appearance' | 'hotel-hours' | 'reservation-policy' | 'mobile-design' | 'kbs';

// ── Hotel Hours sub-view ───────────────────────────────────────────────────────

function HotelHoursView({ isTr, onBack }: { isTr: boolean; onBack: () => void }) {
  const [checkInTime,  setCheckInTime]  = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('12:00');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [message,  setMessage]  = useState('');
  const [isError,  setIsError]  = useState(false);

  useEffect(() => {
    fetch('/api/settings/checkin-times')
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setCheckInTime(data.checkInTime);
          setCheckOutTime(data.checkOutTime);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings/checkin-times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkInTime, checkOutTime }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? 'Hata');
      setIsError(false);
      setMessage(isTr ? 'Saatler kaydedildi.' : 'Times saved.');
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : (isTr ? 'Kaydedilemedi.' : 'Could not save.'));
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'control-base px-4 py-3 text-sm';

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-subtle hover:text-main transition-colors"
        >
          <ChevronLeft size={14} />
          {isTr ? 'Sistem Ayarları' : 'Settings'}
        </button>
        <span className="text-faint">/</span>
        <span className="text-xs text-muted font-medium">
          {isTr ? 'Otel Saatleri' : 'Hotel Hours'}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
          <Clock size={18} className="text-brand-accent" />
        </div>
        <div>
          <h2 className="text-base font-bold text-main leading-none">
            {isTr ? 'Check-in / Check-out Saatleri' : 'Check-in / Check-out Times'}
          </h2>
          <p className="text-[11px] text-subtle mt-0.5">
            {isTr
              ? 'Bu saatler rezervasyon onayında, müşteri panelinde ve personel ekranında gösterilir.'
              : 'These times are shown in booking confirmations, customer portal, and staff screens.'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={18} className="animate-spin text-brand-accent/40" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="surface-panel p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[10px] text-subtle uppercase tracking-wider">
                {isTr ? 'Check-in Saati' : 'Check-in Time'}
              </label>
              <input
                type="time"
                value={checkInTime}
                onChange={e => setCheckInTime(e.target.value)}
                className={inputCls}
                required
              />
              <p className="text-[10px] text-subtle">
                {isTr ? 'Standart odaya giriş saati' : 'Standard room entry time'}
              </p>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] text-subtle uppercase tracking-wider">
                {isTr ? 'Check-out Saati' : 'Check-out Time'}
              </label>
              <input
                type="time"
                value={checkOutTime}
                onChange={e => setCheckOutTime(e.target.value)}
                className={inputCls}
                required
              />
              <p className="text-[10px] text-subtle">
                {isTr ? 'Standart odadan çıkış saati' : 'Standard room departure time'}
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="surface-card px-4 py-3 flex gap-6 flex-wrap">
            <div>
              <p className="text-[9px] text-subtle uppercase tracking-wider mb-1">{isTr ? 'Önizleme' : 'Preview'}</p>
              <p className="text-xs text-muted">
                {isTr ? 'Giriş' : 'Check-in'}: <span className="text-brand-accent font-semibold">{checkInTime}</span>
                <span className="mx-3 text-faint">·</span>
                {isTr ? 'Çıkış' : 'Check-out'}: <span className="text-brand-accent font-semibold">{checkOutTime}</span>
              </p>
            </div>
          </div>

          {message && (
            <p className={`text-xs ${isError ? 'text-red-400' : 'text-emerald-400'}`}>{message}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-accent text-black text-xs font-bold disabled:opacity-50 hover:brightness-105 transition-all"
            >
              {saving && <Loader2 size={12} className="animate-spin" />}
              {saving ? (isTr ? 'Kaydediliyor…' : 'Saving…') : (isTr ? 'Kaydet' : 'Save')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Reservation policy sub-view ────────────────────────────────────────────────

function ReservationPolicyView({ isTr, onBack }: { isTr: boolean; onBack: () => void }) {
  const [cutoffHours, setCutoffHours] = useState(48);
  const [refundRate, setRefundRate]   = useState(100);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    fetch('/api/settings/reservation-policy')
      .then(r => r.json())
      .then(d => {
        if (d.ok) { setCutoffHours(d.cancelCutoffHours); setRefundRate(d.refundRatePercent); }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings/reservation-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelCutoffHours: cutoffHours, refundRatePercent: refundRate }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setIsError(false);
      setMessage(isTr ? 'Politika kaydedildi.' : 'Policy saved.');
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : (isTr ? 'Kaydedilemedi.' : 'Could not save.'));
    } finally {
      setSaving(false);
    }
  }

  const hourPresets = [12, 24, 48, 72];
  const ratePresets = [100, 75, 50, 0];

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-subtle hover:text-main transition-colors">
          <ChevronLeft size={14} />{isTr ? 'Sistem Ayarları' : 'Settings'}
        </button>
        <span className="text-faint">/</span>
        <span className="text-xs text-muted font-medium">{isTr ? 'İptal & İade Politikası' : 'Cancellation & Refund'}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
          <Ban size={18} className="text-brand-accent" />
        </div>
        <div>
          <h2 className="text-base font-bold text-main leading-none">{isTr ? 'İptal & İade Politikası' : 'Cancellation & Refund Policy'}</h2>
          <p className="text-[11px] text-subtle mt-0.5">{isTr ? 'Müşterilerin ne zamana kadar iptal edebileceğini ve iade oranını belirleyin.' : 'Set the cancellation deadline and refund rate.'}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="surface-panel p-6 space-y-6">
        {/* Cutoff hours */}
        <div>
          <label className="block text-sm font-semibold text-main mb-1">{isTr ? 'İptal Süresi' : 'Cancellation Deadline'}</label>
          <p className="text-[11px] text-subtle mb-2.5">{isTr ? 'Müşteri, girişten en geç kaç saat öncesine kadar iptal edebilsin?' : 'Until how many hours before check-in can a guest cancel?'}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 surface-card px-2 py-1.5 rounded-xl">
              <button type="button" onClick={() => setCutoffHours(h => Math.max(0, h - 6))} className="w-7 h-7 rounded-lg hover:bg-m-hover text-muted hover:text-main text-lg leading-none">−</button>
              <input type="number" min={0} max={720} value={cutoffHours} onChange={e => setCutoffHours(Math.max(0, Math.min(720, Number(e.target.value) || 0)))} className="w-16 bg-transparent text-center text-lg font-bold text-main outline-none tabular-nums" />
              <button type="button" onClick={() => setCutoffHours(h => Math.min(720, h + 6))} className="w-7 h-7 rounded-lg hover:bg-m-hover text-muted hover:text-main text-lg leading-none">+</button>
            </div>
            <span className="text-sm text-muted">{isTr ? 'saat önce' : 'hours before'}</span>
            <div className="flex gap-1.5 ml-1">
              {hourPresets.map(h => (
                <button key={h} type="button" onClick={() => setCutoffHours(h)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${cutoffHours === h ? 'bg-brand-accent/15 text-brand-accent border border-brand-accent/20' : 'text-subtle border border-m-border hover:bg-m-hover'}`}>{h}s</button>
              ))}
            </div>
          </div>
        </div>

        {/* Refund rate */}
        <div>
          <label className="block text-sm font-semibold text-main mb-1">{isTr ? 'İade Oranı' : 'Refund Rate'}</label>
          <p className="text-[11px] text-subtle mb-2.5">{isTr ? 'Zamanında yapılan iptallerde ödemenin yüzde kaçı iade edilsin?' : 'What percentage of the payment is refunded on a timely cancellation?'}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 surface-card px-2 py-1.5 rounded-xl">
              <button type="button" onClick={() => setRefundRate(r => Math.max(0, r - 5))} className="w-7 h-7 rounded-lg hover:bg-m-hover text-muted hover:text-main text-lg leading-none">−</button>
              <input type="number" min={0} max={100} value={refundRate} onChange={e => setRefundRate(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className="w-16 bg-transparent text-center text-lg font-bold text-main outline-none tabular-nums" />
              <button type="button" onClick={() => setRefundRate(r => Math.min(100, r + 5))} className="w-7 h-7 rounded-lg hover:bg-m-hover text-muted hover:text-main text-lg leading-none">+</button>
            </div>
            <span className="text-sm text-muted">%</span>
            <div className="flex gap-1.5 ml-1">
              {ratePresets.map(r => (
                <button key={r} type="button" onClick={() => setRefundRate(r)} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${refundRate === r ? 'bg-brand-accent/15 text-brand-accent border border-brand-accent/20' : 'text-subtle border border-m-border hover:bg-m-hover'}`}>%{r}</button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-subtle mt-2">
            {isTr
              ? `Süre sonrasında iptal/iade kapalıdır. ${refundRate === 100 ? 'Tam iade.' : refundRate === 0 ? 'İade yapılmaz.' : `%${100 - refundRate} kesinti uygulanır.`}`
              : `After the deadline, cancellation is closed. ${refundRate === 100 ? 'Full refund.' : refundRate === 0 ? 'No refund.' : `${100 - refundRate}% fee applies.`}`}
          </p>
        </div>

        {message && <p className={`text-xs ${isError ? 'text-red-400' : 'text-emerald-400'}`}>{message}</p>}

        <button type="submit" disabled={saving || loading} className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm disabled:opacity-50">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
          {saving ? (isTr ? 'Kaydediliyor…' : 'Saving…') : (isTr ? 'Kaydet' : 'Save')}
        </button>
      </form>
    </div>
  );
}

// ── Mobile design sub-view ─────────────────────────────────────────────────────

function PhoneMock({ variant }: { variant: 'new' | 'classic' }) {
  return (
    <div className="w-20 h-36 rounded-[14px] border border-m-border bg-m-surface2 p-1.5 shadow-md">
      {variant === 'new' ? (
        <div className="h-full w-full rounded-[10px] overflow-hidden flex flex-col" style={{ background: '#1a1612' }}>
          <div className="h-[46%] w-full" style={{ background: 'linear-gradient(160deg,#5a4636,#1a1612)' }} />
          <div className="px-1.5 pt-1.5 space-y-1">
            <div className="h-1.5 w-3/4 rounded-full" style={{ background: '#f4b584' }} />
            <div className="h-1 w-1/2 rounded-full bg-white/25" />
            <div className="mt-1 flex gap-1">
              <div className="h-7 flex-1 rounded" style={{ background: '#2a2018' }} />
              <div className="h-7 flex-1 rounded" style={{ background: '#2a2018' }} />
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full w-full rounded-[10px] overflow-hidden flex flex-col" style={{ background: '#07100f' }}>
          <div className="h-2.5 w-full bg-white/10" />
          <div className="flex-1 flex items-center justify-center">
            <div className="h-9 w-9 rounded-full border-2 border-white/20" />
          </div>
          <div className="h-3 w-full bg-white/[0.06]" />
        </div>
      )}
    </div>
  );
}

function MobileDesignView({ isTr, onBack }: { isTr: boolean; onBack: () => void }) {
  const [selected, setSelected] = useState<'new' | 'classic'>('new');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    fetch('/api/settings/mobile-design')
      .then((r) => r.json())
      .then((d) => { if (d.mobileDesign) setSelected(d.mobileDesign); })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  async function save(value: 'new' | 'classic') {
    if (value === selected && !isError) return;
    const previous = selected;
    setSelected(value);
    setSaving(true);
    setMessage('');
    setIsError(false);
    try {
      const res = await fetch('/api/settings/mobile-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileDesign: value }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.message);
      setMessage(isTr ? 'Kaydedildi.' : 'Saved.');
    } catch {
      setSelected(previous);
      setIsError(true);
      setMessage(isTr ? 'Kaydedilemedi.' : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  const options = [
    {
      id: 'new' as const,
      title: isTr ? 'Yeni Tasarım' : 'New Design',
      tag: isTr ? 'Editoryal · Önerilen' : 'Editorial · Recommended',
      desc: isTr
        ? 'Mobil-öncelikli, sinematik ve modern arayüz.'
        : 'Mobile-first, cinematic, modern interface.',
    },
    {
      id: 'classic' as const,
      title: isTr ? 'Klasik Tasarım' : 'Classic Design',
      tag: isTr ? 'Eski görünüm' : 'Original look',
      desc: isTr
        ? 'Sitenin önceki (masaüstü türevi) mobil görünümü.'
        : 'The site’s previous (desktop-derived) mobile look.',
    },
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-subtle hover:text-main transition-colors"
        >
          <ChevronLeft size={14} />
          {isTr ? 'Sistem Ayarları' : 'Settings'}
        </button>
        <span className="text-faint">/</span>
        <span className="text-xs text-muted font-medium">{isTr ? 'Mobil Görünüm' : 'Mobile Design'}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
          <Smartphone size={18} className="text-brand-accent" />
        </div>
        <div>
          <h2 className="text-base font-bold text-main leading-none">
            {isTr ? 'Mobil Görünüm' : 'Mobile Design'}
          </h2>
          <p className="text-[11px] text-subtle mt-0.5">
            {isTr
              ? 'Ziyaretçilerin telefonda göreceği tasarımı seçin. Masaüstü her iki seçenekte de aynı kalır.'
              : 'Choose the design phone visitors see. Desktop stays the same in both options.'}
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="grid sm:grid-cols-2 gap-3">
        {options.map((o) => {
          const isActive = selected === o.id;
          return (
            <button
              key={o.id}
              type="button"
              disabled={saving || loading}
              onClick={() => save(o.id)}
              className={`relative text-left p-5 rounded-xl border transition-all disabled:opacity-60 ${
                isActive
                  ? 'bg-brand-accent/10 border-brand-accent shadow-lg shadow-brand-accent/10'
                  : 'surface-card hover:border-m-border2 hover:bg-m-hover'
              }`}
            >
              <div className="mb-4 flex justify-center">
                <PhoneMock variant={o.id} />
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-main">{o.title}</p>
                  <p className="text-[10px] text-brand-accent font-semibold uppercase tracking-widest mt-0.5">
                    {o.tag}
                  </p>
                </div>
                {isActive && <CheckCircle2 size={15} className="text-brand-accent shrink-0" />}
              </div>
              <p className="text-[11px] text-subtle mt-2 leading-relaxed">{o.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Status */}
      <div className="h-4">
        {saving ? (
          <p className="text-xs text-subtle flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" /> {isTr ? 'Kaydediliyor…' : 'Saving…'}
          </p>
        ) : message ? (
          <p className={`text-xs ${isError ? 'text-red-400' : 'text-emerald-400'}`}>{message}</p>
        ) : null}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

// ── KBS (Kimlik Bildirimi) sub-view ───────────────────────────────────────────

interface KbsSettings {
  enabled: boolean;
  authority: 'egm' | 'jandarma';
  endpoint: string;
  defaultJandarmaEndpoint: string;
  tesisKodu: string;
  kullaniciTc: string;
  sifreSet: boolean;
  configured: boolean;
  cryptoReady: boolean;
}

interface KbsBildirimRow {
  id: string;
  confirmationId: string;
  islemTipi: string;
  durum: string;
  hataKodu: number | null;
  mesaj: string | null;
  guestName: string | null;
  kimlikNo: string | null;
  odaNo: string | null;
  denemeSayisi: number;
  gonderimZamani: string | null;
  createdAt: string;
}

function KbsView({ isTr, onBack }: { isTr: boolean; onBack: () => void }) {
  const [settings, setSettings] = useState<KbsSettings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState(false);
  const [toggling, setToggling] = useState(false);
  const [message, setMessage]   = useState('');
  const [isError, setIsError]   = useState(false);

  const [authority, setAuthority]     = useState<'egm' | 'jandarma'>('egm');
  const [endpoint, setEndpoint]       = useState('');
  const [tesisKodu, setTesisKodu]     = useState('');
  const [kullaniciTc, setKullaniciTc] = useState('');
  const [sifre, setSifre]             = useState('');

  const [bildirimler, setBildirimler] = useState<KbsBildirimRow[]>([]);
  const [counts, setCounts] = useState<{ hata: number; gonderildi: number; bekliyor: number } | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadSettings = () =>
    fetch('/api/settings/kbs', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (!d.ok) return;
        setSettings(d.settings);
        setAuthority(d.settings.authority);
        setEndpoint(d.settings.endpoint ?? '');
        setTesisKodu(d.settings.tesisKodu ?? '');
        setKullaniciTc(d.settings.kullaniciTc ?? '');
      })
      .catch(() => undefined);

  const loadBildirimler = () =>
    fetch('/api/kbs/bildirimler?limit=10', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (!d.ok) return;
        setBildirimler(d.items);
        setCounts(d.counts);
      })
      .catch(() => undefined);

  useEffect(() => {
    Promise.all([loadSettings(), loadBildirimler()]).finally(() => setLoading(false));
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings/kbs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          authority,
          endpoint,
          tesisKodu,
          kullaniciTc,
          ...(sifre ? { sifre } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? 'Hata');
      setSifre('');
      await loadSettings();
      setIsError(false);
      setMessage(isTr ? 'Ayarlar kaydedildi. Şimdi bağlantıyı test edebilirsiniz.' : 'Settings saved. You can now test the connection.');
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : (isTr ? 'Kaydedilemedi.' : 'Could not save.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings/kbs/test', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      setIsError(!data.ok);
      setMessage(data.message ?? (data.ok ? 'Bağlantı başarılı.' : 'Bağlantı başarısız.'));
    } catch {
      setIsError(true);
      setMessage(isTr ? 'Test isteği gönderilemedi.' : 'Could not send test request.');
    } finally {
      setTesting(false);
    }
  }

  async function handleToggle(next: boolean) {
    setToggling(true);
    setMessage('');
    try {
      const res = await fetch('/api/settings/kbs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.message ?? 'Hata');
      await loadSettings();
      setIsError(false);
      setMessage(next
        ? (isTr ? 'KBS bildirimi AKTİF — check-in/check-out işlemleri kolluğa bildirilecek.' : 'KBS notifications are ON.')
        : (isTr ? 'KBS bildirimi kapatıldı.' : 'KBS notifications are OFF.'));
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : 'Hata');
    } finally {
      setToggling(false);
    }
  }

  async function handleRetry(id: string) {
    setRetryingId(id);
    try {
      const res = await fetch('/api/kbs/bildirimler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      setIsError(!data.ok);
      setMessage(data.message ?? '');
      await loadBildirimler();
    } catch {
      setIsError(true);
      setMessage(isTr ? 'Tekrar deneme başarısız.' : 'Retry failed.');
    } finally {
      setRetryingId(null);
    }
  }

  const inputCls = 'control-base px-4 py-3 text-sm w-full';
  const labelCls = 'block text-[10px] text-subtle uppercase tracking-wider';
  const enabled = settings?.enabled ?? false;

  const durumChip = (durum: string) => {
    const map: Record<string, { cls: string; tr: string; en: string }> = {
      gonderildi: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', tr: 'Gönderildi', en: 'Sent' },
      hata:       { cls: 'bg-red-500/15 text-red-400 border-red-500/25',             tr: 'Hata',       en: 'Error' },
      bekliyor:   { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/25',       tr: 'Bekliyor',   en: 'Pending' },
      atlandi:    { cls: 'bg-m-surface2 text-subtle border-m-border',                tr: 'Atlandı',    en: 'Skipped' },
    };
    const m = map[durum] ?? map.bekliyor;
    return (
      <span className={`inline-flex px-1.5 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wide ${m.cls}`}>
        {isTr ? m.tr : m.en}
      </span>
    );
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-subtle hover:text-main transition-colors"
        >
          <ChevronLeft size={14} />
          {isTr ? 'Sistem Ayarları' : 'Settings'}
        </button>
        <span className="text-faint">/</span>
        <span className="text-xs text-muted font-medium">KBS</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
          <ShieldCheck size={18} className="text-brand-accent" />
        </div>
        <div>
          <h2 className="text-base font-bold text-main leading-none">
            {isTr ? 'KBS — Kimlik Bildirim Sistemi' : 'KBS — Identity Notification'}
          </h2>
          <p className="text-[11px] text-subtle mt-0.5">
            {isTr
              ? 'Check-in/check-out yapan misafirler 1774 sayılı kanun gereği kolluğa otomatik bildirilir.'
              : 'Guests are automatically reported to law enforcement (Turkish law no. 1774) on check-in/out.'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={18} className="animate-spin text-brand-accent/40" />
        </div>
      ) : (
        <>
          {/* Durum + etkinleştirme */}
          <div className="surface-panel p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {enabled
                ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                : <AlertTriangle size={18} className="text-amber-400 shrink-0" />}
              <div className="min-w-0">
                <p className="text-sm font-bold text-main">
                  {enabled
                    ? (isTr ? 'Entegrasyon aktif' : 'Integration active')
                    : settings?.configured
                      ? (isTr ? 'Kurulu — etkinleştirilmedi' : 'Configured — not enabled')
                      : (isTr ? 'Kurulum bekleniyor' : 'Setup pending')}
                </p>
                <p className="text-[11px] text-subtle mt-0.5">
                  {isTr
                    ? 'Etkinleştirmeden önce bilgileri kaydedip "Bağlantıyı Test Et" ile doğrulayın.'
                    : 'Save the credentials and run "Test Connection" before enabling.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={toggling || (!enabled && !settings?.configured)}
              onClick={() => handleToggle(!enabled)}
              className={`relative w-12 h-6.5 rounded-full transition-colors shrink-0 disabled:opacity-40 ${
                enabled ? 'bg-emerald-500/80' : 'bg-m-surface2 border border-m-border'
              }`}
              aria-label={isTr ? 'KBS aç/kapat' : 'Toggle KBS'}
            >
              <span
                className={`absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow transition-all ${
                  enabled ? 'right-0.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {!settings?.cryptoReady && (
            <div className="surface-panel p-4 border border-red-500/30 flex items-start gap-2.5">
              <AlertTriangle size={15} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted leading-relaxed">
                {isTr
                  ? <>Sunucuda <code className="text-red-400">KBS_SECRET_KEY</code> tanımlı değil — şifre güvenli saklanamaz. Sunucu .env dosyasına <code className="text-subtle">openssl rand -hex 32</code> ile üretilen bir anahtar ekleyin ve uygulamayı yeniden başlatın.</>
                  : <><code className="text-red-400">KBS_SECRET_KEY</code> is not set on the server — the password cannot be stored securely. Add a key generated with <code className="text-subtle">openssl rand -hex 32</code> to the server .env and restart.</>}
              </p>
            </div>
          )}

          {/* Kurulum formu */}
          <form onSubmit={handleSave} className="surface-panel p-6 space-y-5">
            <div className="space-y-2">
              <label className={labelCls}>{isTr ? 'Yetki Alanı' : 'Authority'}</label>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: 'egm', title: isTr ? 'Polis (EGM)' : 'Police (EGM)', desc: isTr ? 'Şehir merkezi tesisleri' : 'City-centre properties' },
                  { id: 'jandarma', title: 'Jandarma', desc: isTr ? 'Belediye sınırı dışı tesisler' : 'Properties outside city limits' },
                ] as const).map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAuthority(opt.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      authority === opt.id
                        ? 'border-brand-accent/60 bg-brand-accent/10'
                        : 'surface-card hover:border-m-border2'
                    }`}
                  >
                    <p className="text-sm font-bold text-main">{opt.title}</p>
                    <p className="text-[11px] text-subtle mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className={labelCls}>{isTr ? 'Web Servis Adresi' : 'Web Service URL'}</label>
              <input
                type="url"
                value={endpoint}
                onChange={e => setEndpoint(e.target.value)}
                placeholder={authority === 'jandarma'
                  ? settings?.defaultJandarmaEndpoint
                  : 'https://… (EGM portalından alınız)'}
                className={inputCls}
              />
              <p className="text-[10px] text-subtle">
                {authority === 'jandarma'
                  ? (isTr ? 'Boş bırakılırsa standart Jandarma adresi kullanılır.' : 'Leave empty to use the standard Jandarma endpoint.')
                  : (isTr ? 'EGM web servis adresinizi kbs.egm.gov.tr → "Web Servis İşlemleri" sayfasından öğrenin.' : 'Get your EGM endpoint from kbs.egm.gov.tr → "Web Service Operations".')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={labelCls}>{isTr ? 'Tesis Kodu' : 'Facility Code'}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={tesisKodu}
                  onChange={e => setTesisKodu(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className={inputCls}
                />
                <p className="text-[10px] text-subtle">
                  {isTr ? 'Portalda tesis seçim alanında görünen 6 haneli kod.' : '6-digit code shown in the portal facility selector.'}
                </p>
              </div>
              <div className="space-y-2">
                <label className={labelCls}>{isTr ? 'Yetkili TC Kimlik No' : 'Authorized User TC ID'}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  value={kullaniciTc}
                  onChange={e => setKullaniciTc(e.target.value.replace(/\D/g, ''))}
                  placeholder="11111111111"
                  className={inputCls}
                />
                <p className="text-[10px] text-subtle">
                  {isTr ? 'Web servis yetkisi verilen kullanıcının TC kimlik numarası.' : 'TC ID of the user with web-service authorization.'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className={labelCls}>{isTr ? 'Web Servis Şifresi' : 'Web Service Password'}</label>
              <input
                type="password"
                value={sifre}
                onChange={e => setSifre(e.target.value)}
                autoComplete="new-password"
                placeholder={settings?.sifreSet
                  ? (isTr ? '•••••••• (kayıtlı — değiştirmek için yazın)' : '•••••••• (saved — type to replace)')
                  : (isTr ? 'Portal → Web Servis İşlemleri → Şifre' : 'Portal → Web Service Operations → Password')}
                className={inputCls}
              />
              <p className="text-[10px] text-subtle">
                {isTr
                  ? 'Şifre sunucuda şifreli saklanır ve bir daha görüntülenmez; yalnız değiştirilebilir.'
                  : 'Stored encrypted on the server and never shown again; it can only be replaced.'}
              </p>
            </div>

            {message && (
              <p className={`text-xs ${isError ? 'text-red-400' : 'text-emerald-400'}`}>{message}</p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
              >
                {saving ? (isTr ? 'Kaydediliyor…' : 'Saving…') : (isTr ? 'Kaydet' : 'Save')}
              </button>
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !settings?.configured}
                className="control-base px-5 py-2.5 text-sm disabled:opacity-50 inline-flex items-center gap-2"
              >
                {testing && <Loader2 size={13} className="animate-spin" />}
                {isTr ? 'Bağlantıyı Test Et' : 'Test Connection'}
              </button>
            </div>
          </form>

          {/* Son bildirimler */}
          <div className="surface-panel p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-main">{isTr ? 'Son Bildirimler' : 'Recent Notifications'}</h3>
                {counts && (
                  <p className="text-[11px] text-subtle mt-0.5">
                    {isTr
                      ? `${counts.gonderildi} gönderildi · ${counts.hata} hata · ${counts.bekliyor} bekliyor`
                      : `${counts.gonderildi} sent · ${counts.hata} errors · ${counts.bekliyor} pending`}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => loadBildirimler()}
                className="text-xs text-subtle hover:text-main transition-colors inline-flex items-center gap-1.5"
              >
                <RotateCw size={12} />
                {isTr ? 'Yenile' : 'Refresh'}
              </button>
            </div>

            {bildirimler.length === 0 ? (
              <p className="text-xs text-subtle py-4 text-center">
                {isTr ? 'Henüz bildirim yok — ilk check-in ile oluşur.' : 'No notifications yet — created on first check-in.'}
              </p>
            ) : (
              <div className="space-y-2">
                {bildirimler.map(b => (
                  <div key={b.id} className="surface-card p-3 rounded-xl flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {durumChip(b.durum)}
                        <span className="text-xs font-bold text-main truncate">{b.guestName ?? '—'}</span>
                        <span className="text-[10px] text-subtle">
                          {b.islemTipi === 'giris' ? (isTr ? 'Giriş' : 'Check-in') : (isTr ? 'Çıkış' : 'Check-out')}
                          {b.odaNo ? ` · ${isTr ? 'Oda' : 'Room'} ${b.odaNo}` : ''}
                          {b.kimlikNo ? ` · ${b.kimlikNo}` : ''}
                          {` · #${b.confirmationId}`}
                        </span>
                      </div>
                      {b.mesaj && (
                        <p className={`text-[10px] mt-1 truncate ${b.durum === 'hata' ? 'text-red-400/90' : 'text-subtle'}`}>
                          {b.hataKodu ? `[${b.hataKodu}] ` : ''}{b.mesaj}
                        </p>
                      )}
                    </div>
                    {b.durum === 'hata' && (
                      <button
                        type="button"
                        disabled={retryingId === b.id}
                        onClick={() => handleRetry(b.id)}
                        className="control-base px-3 py-1.5 text-[11px] shrink-0 disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        {retryingId === b.id
                          ? <Loader2 size={11} className="animate-spin" />
                          : <RotateCw size={11} />}
                        {isTr ? 'Tekrar Dene' : 'Retry'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kurulum rehberi */}
          <div className="surface-panel p-5">
            <h3 className="text-xs font-bold text-main uppercase tracking-wider">
              {isTr ? 'Bilgileri nereden alacağım?' : 'Where do I find these?'}
            </h3>
            <ol className="mt-3 space-y-1.5 text-[11px] text-muted leading-relaxed list-decimal list-inside">
              <li>{isTr ? <>e-Devlet ile <span className="text-main">kbs.egm.gov.tr</span> adresine girin.</> : <>Sign in to <span className="text-main">kbs.egm.gov.tr</span> via e-Devlet.</>}</li>
              <li>{isTr ? <>Sol menüden <span className="text-main">"Web Servis İşlemleri"</span> sayfasını açın — Tesis Kodu ve Şifre burada görünür. (Menü yoksa bağlı emniyetten web servis yetkisi isteyin.)</> : <>Open <span className="text-main">"Web Service Operations"</span> — facility code and password are shown there.</>}</li>
              <li>{isTr ? <>Aynı sayfada bu sunucunun statik IP adresini kaydedin — KBS yalnız kayıtlı IP'den gelen bildirimi kabul eder.</> : <>Register this server's static IP on the same page — KBS only accepts calls from registered IPs.</>}</li>
              <li>{isTr ? <>Bilgileri buraya girip kaydedin, "Bağlantıyı Test Et" ile doğrulayın, sonra entegrasyonu etkinleştirin.</> : <>Save the credentials here, verify with "Test Connection", then enable the integration.</>}</li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
}

export function AdminSettings({ tr: isTr }: { tr: boolean }) {
  const [view, setView] = useState<View>('main');
  const { theme, setTheme, mode } = useTheme();

  // ── Appearance sub-view ────────────────────────────────────────────────────
  if (view === 'appearance') {
    return (
      <div className="space-y-5 max-w-3xl">

        {/* Back + header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('main')}
            className="flex items-center gap-1.5 text-xs text-subtle hover:text-main transition-colors"
          >
            <ChevronLeft size={14} />
            {isTr ? 'Sistem Ayarları' : 'Settings'}
          </button>
          <span className="text-faint">/</span>
          <span className="text-xs text-muted font-medium">
            {isTr ? 'Görünüm' : 'Appearance'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center">
            <Palette size={18} className="text-brand-accent" />
          </div>
          <div>
            <h2 className="text-base font-bold text-main leading-none">
              {isTr ? 'Tema Seçimi' : 'Theme Selection'}
            </h2>
            <p className="text-[11px] text-subtle mt-0.5">
              {isTr
                ? 'Sitenin global renk paletini ve temasını değiştirin.'
                : 'Change the global color palette and theme of the site.'}
            </p>
          </div>
        </div>

        {/* Theme grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {THEMES.map((t) => {
            const isActive = theme === t.id;
            const activeBase = mode === 'light' ? t.lightBase : t.base;
            const activeSurface = mode === 'light' ? t.lightSurface : t.surface;
            const previewBase = mode === 'light' ? t.base : t.lightBase;
            const previewSurface = mode === 'light' ? t.surface : t.lightSurface;
            return (
              <div
                key={t.id}
                onClick={() => setTheme(t.id as Parameters<typeof setTheme>[0])}
                className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                  isActive
                    ? 'bg-brand-accent/10 border-brand-accent shadow-lg shadow-brand-accent/10'
                    : 'surface-card hover:border-m-border2 hover:bg-m-hover'
                }`}
              >
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-main">{t.name}</span>
                    <p className="text-[10px] text-subtle mt-0.5 leading-snug">{t.mood}</p>
                  </div>
                  {isActive && (
                    <CheckCircle2 size={13} className="text-brand-accent shrink-0" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="grid grid-cols-[1fr_1fr_2rem] gap-1.5">
                    <div className="h-8 rounded-lg border border-m-border" style={{ backgroundColor: activeBase }} />
                    <div className="h-8 rounded-lg border border-m-border" style={{ backgroundColor: activeSurface }} />
                    <div className="h-8 rounded-lg border border-m-border" style={{ backgroundColor: t.accent }} />
                  </div>
                  <div className="grid grid-cols-[1fr_1fr_2rem] gap-1.5 opacity-55">
                    <div className="h-2 rounded-full border border-m-border" style={{ backgroundColor: previewBase }} />
                    <div className="h-2 rounded-full border border-m-border" style={{ backgroundColor: previewSurface }} />
                    <div className="h-2 rounded-full border border-m-border" style={{ backgroundColor: t.accent }} />
                  </div>
                </div>
                {isActive && (
                  <div className="mt-2.5">
                    <span className="text-[9px] text-brand-accent font-bold uppercase tracking-widest">
                      {isTr ? 'Aktif' : 'Active'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    );
  }

  // ── Hotel hours sub-view ──────────────────────────────────────────────────
  if (view === 'hotel-hours') {
    return <HotelHoursView isTr={isTr} onBack={() => setView('main')} />;
  }

  if (view === 'reservation-policy') {
    return <ReservationPolicyView isTr={isTr} onBack={() => setView('main')} />;
  }

  if (view === 'mobile-design') {
    return <MobileDesignView isTr={isTr} onBack={() => setView('main')} />;
  }

  if (view === 'kbs') {
    return <KbsView isTr={isTr} onBack={() => setView('main')} />;
  }

  // ── Main settings view ─────────────────────────────────────────────────────

  const cards = [
    {
      id: 'appearance',
      Icon: Palette,
      title: isTr ? 'Görünüm' : 'Appearance',
      desc: isTr
        ? 'Sitenin global renk paletini ve tema şemasını değiştirin.'
        : 'Change the global color palette and theme of the site.',
      badge: isTr ? 'Aktif' : 'Active',
      available: true,
      onClick: () => setView('appearance'),
    },
    {
      id: 'mobile-design',
      Icon: Smartphone,
      title: isTr ? 'Mobil Görünüm' : 'Mobile Design',
      desc: isTr
        ? 'Mobil ziyaretçilerin göreceği tasarımı seçin (Yeni / Klasik).'
        : 'Choose the design mobile visitors see (New / Classic).',
      badge: isTr ? 'Yeni' : 'New',
      available: true,
      onClick: () => setView('mobile-design'),
    },
    {
      id: 'hotel-hours',
      Icon: Clock,
      title: isTr ? 'Otel Saatleri' : 'Hotel Hours',
      desc: isTr
        ? 'Standart check-in ve check-out saatlerini belirleyin.'
        : 'Set standard check-in and check-out times.',
      badge: null,
      available: true,
      onClick: () => setView('hotel-hours'),
    },
    {
      id: 'reservation-policy',
      Icon: Ban,
      title: isTr ? 'İptal & İade' : 'Cancellation & Refund',
      desc: isTr
        ? 'İptal süresi ve iade oranı kurallarını belirleyin.'
        : 'Set the cancellation deadline and refund rate.',
      badge: null,
      available: true,
      onClick: () => setView('reservation-policy'),
    },
    {
      id: 'kbs',
      Icon: ShieldCheck,
      title: isTr ? 'KBS — Kimlik Bildirimi' : 'KBS — ID Notification',
      desc: isTr
        ? 'Misafir giriş/çıkışlarının kolluğa otomatik bildirimi (1774 sayılı kanun).'
        : 'Automatic guest check-in/out reporting to law enforcement.',
      badge: isTr ? 'Yeni' : 'New',
      available: true,
      onClick: () => setView('kbs'),
    },
    {
      id: 'pricing',
      Icon: CreditCard,
      title: isTr ? 'Fiyatlandırma' : 'Pricing',
      desc: isTr
        ? 'Oda fiyatları, sezon tarifeleri ve indirim kuralları.'
        : 'Room prices, seasonal rates and discount rules.',
      badge: null,
      available: false,
      onClick: undefined,
    },
    {
      id: 'notifications',
      Icon: Bell,
      title: isTr ? 'Bildirimler' : 'Notifications',
      desc: isTr
        ? 'E-posta bildirimleri ve sistem uyarı ayarları.'
        : 'Email notification and system alert settings.',
      badge: null,
      available: false,
      onClick: undefined,
    },
    {
      id: 'system',
      Icon: Server,
      title: isTr ? 'Sistem' : 'System',
      desc: isTr
        ? 'Genel sistem yapılandırmaları ve bakım ayarları.'
        : 'General system configuration and maintenance settings.',
      badge: null,
      available: false,
      onClick: undefined,
    },
  ] as const;

  return (
    <div className="space-y-5 max-w-3xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-m-surface2 border border-m-border flex items-center justify-center">
          <Server size={18} className="text-subtle" />
        </div>
        <div>
          <h2 className="text-base font-bold text-main leading-none">
            {isTr ? 'Sistem Ayarları' : 'System Settings'}
          </h2>
          <p className="text-[11px] text-subtle mt-0.5">
            {isTr
              ? 'Site yapılandırması ve genel sistem ayarları.'
              : 'Site configuration and general system settings.'}
          </p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map(({ id, Icon, title, desc, badge, available, onClick }) => (
          <div
            key={id}
            onClick={available ? onClick : undefined}
            className={`
              relative p-5 rounded-xl border transition-all
              ${available
                ? 'surface-card hover:border-m-border2 hover:bg-m-hover cursor-pointer group'
                : 'surface-card opacity-45 cursor-not-allowed'}
            `}
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                available
                  ? 'bg-brand-accent/10 border-brand-accent/20 group-hover:bg-brand-accent/15'
                  : 'bg-m-surface2 border-m-border'
              }`}>
                <Icon size={18} className={available ? 'text-brand-accent' : 'text-subtle'} />
              </div>

              {available ? (
                <ChevronRight
                  size={15}
                  className="text-subtle group-hover:text-brand-accent/70 transition-colors mt-0.5 shrink-0"
                />
              ) : (
                <span className="text-[9px] text-subtle font-bold uppercase tracking-widest mt-1 shrink-0">
                  {isTr ? 'Yakında' : 'Soon'}
                </span>
              )}
            </div>

            <div className="mt-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-main">{title}</p>
                {badge && (
                  <span className="inline-flex px-1.5 py-0.5 rounded-md bg-brand-accent/15 border border-brand-accent/20 text-[9px] text-brand-accent font-bold uppercase tracking-wide">
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted mt-1 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
