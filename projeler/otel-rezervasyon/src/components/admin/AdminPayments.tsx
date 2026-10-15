'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Loader2, Plus, Search, X, Check, CreditCard,
  TrendingUp, CalendarDays, Wallet, RotateCcw, Banknote,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

interface PaymentRes {
  id: string;
  confirmationId: string;
  firstName: string;
  lastName: string;
  status: string;
  totalPrice: number;
}
interface Payment {
  id: string;
  provider: string;
  method: string | null;
  status: string;
  amount: number;
  currency: string;
  paidAt: string | null;
  createdAt: string;
  reservation: PaymentRes;
}
interface Summary {
  totalPaid: number; todayPaid: number; todayCount: number;
  monthPaid: number; monthCount: number;
  refundedTotal: number; refundedCount: number;
  byStatus: { status: string; count: number; amount: number }[];
}

interface Props { tr: boolean }

const STATUS_STYLE: Record<string, { tr: string; en: string; cls: string }> = {
  paid:        { tr: 'Ödendi',     en: 'Paid',        cls: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10' },
  partial:     { tr: 'Kısmi',      en: 'Partial',     cls: 'text-amber-400 border-amber-500/25 bg-amber-500/10' },
  initialized: { tr: 'Bekliyor',   en: 'Pending',     cls: 'text-amber-400 border-amber-500/25 bg-amber-500/10' },
  failed:      { tr: 'Başarısız',  en: 'Failed',      cls: 'text-red-400 border-red-500/25 bg-red-500/10' },
  expired:     { tr: 'Süresi Doldu', en: 'Expired',   cls: 'text-zinc-400 border-zinc-500/25 bg-zinc-500/10' },
  cancelled:   { tr: 'İptal',      en: 'Cancelled',   cls: 'text-zinc-400 border-zinc-500/25 bg-zinc-500/10' },
  refunded:    { tr: 'İade',       en: 'Refunded',    cls: 'text-violet-400 border-violet-500/25 bg-violet-500/10' },
  refund_failed: { tr: 'İade Hatası', en: 'Refund Failed', cls: 'text-red-400 border-red-500/25 bg-red-500/10' },
};

function methodLabel(p: Payment, tr: boolean) {
  const m = p.method ?? (p.provider === 'iyzico' ? 'online' : null);
  const map: Record<string, { tr: string; en: string }> = {
    cash:     { tr: 'Nakit', en: 'Cash' },
    card:     { tr: 'Kart', en: 'Card' },
    transfer: { tr: 'Havale', en: 'Transfer' },
    online:   { tr: 'Online', en: 'Online' },
  };
  return m ? (tr ? map[m]?.tr : map[m]?.en) ?? m : '—';
}

function money(n: number) { return `₺${n.toLocaleString('tr-TR')}`; }
function fmt(iso: string | null, tr: boolean) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(tr ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Manual payment modal ────────────────────────────────────────────────────

function ManualModal({ tr, onClose, onSaved }: { tr: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [looking, setLooking] = useState(false);
  const [res, setRes] = useState<{ id: string; firstName: string; lastName: string; totalPrice: number; room: { name: string } } | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [saving, setSaving] = useState(false);

  async function lookup() {
    if (!code.trim()) return;
    setLooking(true);
    setRes(null);
    try {
      const r = await fetch(`/api/checkin?code=${encodeURIComponent(code.trim())}`);
      const d = await r.json();
      if (d.ok) { setRes(d.reservation); setAmount(String(d.reservation.totalPrice ?? '')); }
      else toast.error(d.message || (tr ? 'Rezervasyon bulunamadı.' : 'Reservation not found.'));
    } finally {
      setLooking(false);
    }
  }

  async function save() {
    if (!res || !amount) return;
    setSaving(true);
    try {
      const r = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: res.id, amount: Number(amount), method }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.message);
      toast.success(tr ? 'Manuel ödeme kaydedildi.' : 'Manual payment recorded.');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (tr ? 'Hata.' : 'Error.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-md modal-shell" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-m-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
                <Banknote size={14} className="text-emerald-400" />
              </div>
              <p className="text-sm font-bold text-main">{tr ? 'Manuel Ödeme Ekle' : 'Add Manual Payment'}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-subtle hover:text-main hover:bg-m-hover transition-colors"><X size={14} /></button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'Rezervasyon Kodu' : 'Confirmation Code'}</label>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') lookup(); }}
                  placeholder="11110101"
                  className="control-base px-3 py-2 text-sm flex-1 font-mono"
                />
                <button onClick={lookup} disabled={looking} className="btn-secondary px-3 text-sm flex items-center gap-1.5">
                  {looking ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                  {tr ? 'Bul' : 'Find'}
                </button>
              </div>
            </div>

            {res && (
              <div className="surface-soft p-3">
                <p className="text-sm font-bold text-main">{res.firstName} {res.lastName}</p>
                <p className="text-[11px] text-subtle mt-0.5">{res.room.name} · {tr ? 'Toplam' : 'Total'}: {money(res.totalPrice)}</p>
              </div>
            )}

            <div>
              <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'Tahsil Edilen Tutar (₺)' : 'Amount Collected (₺)'}</label>
              <input
                type="number" min={1}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                disabled={!res}
                className="control-base px-3 py-2 text-sm w-full disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'Ödeme Yöntemi' : 'Method'}</label>
              <div className="flex gap-2">
                {(['cash', 'card', 'transfer'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setMethod(m)} disabled={!res}
                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all disabled:opacity-50 ${method === m ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-subtle border-m-border bg-transparent'}`}>
                    {m === 'cash' ? (tr ? 'Nakit' : 'Cash') : m === 'card' ? (tr ? 'Kart' : 'Card') : (tr ? 'Havale' : 'Transfer')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2.5 px-5 pb-5">
            <button onClick={onClose} className="btn-secondary flex-1 text-sm">{tr ? 'İptal' : 'Cancel'}</button>
            <button onClick={save} disabled={!res || !amount || saving} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {tr ? 'Kaydet' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function AdminPayments({ tr }: Props) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [provider, setProvider] = useState('all');
  const [q, setQ] = useState('');
  const [showManual, setShowManual] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== 'all') params.set('status', status);
      if (provider !== 'all') params.set('provider', provider);
      if (q.trim()) params.set('q', q.trim());
      const r = await fetch(`/api/payments?${params}`, { credentials: 'include' });
      const d = await r.json();
      if (d.ok) { setPayments(d.payments); setSummary(d.summary); }
    } finally {
      setLoading(false);
    }
  }, [status, provider, q]);

  useEffect(() => {
    const t = setTimeout(fetchData, q ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchData, q]);

  const cards = [
    { label: tr ? 'Bugün Tahsilat' : 'Collected Today', value: money(summary?.todayPaid ?? 0), sub: `${summary?.todayCount ?? 0} ${tr ? 'işlem' : 'tx'}`, Icon: CalendarDays, cls: 'text-emerald-400' },
    { label: tr ? 'Bu Ay' : 'This Month', value: money(summary?.monthPaid ?? 0), sub: `${summary?.monthCount ?? 0} ${tr ? 'işlem' : 'tx'}`, Icon: TrendingUp, cls: 'text-sky-400' },
    { label: tr ? 'Toplam Tahsilat' : 'Total Collected', value: money(summary?.totalPaid ?? 0), sub: tr ? 'tüm zamanlar' : 'all time', Icon: Wallet, cls: 'text-brand-accent' },
    { label: tr ? 'İade Toplamı' : 'Refunded', value: money(summary?.refundedTotal ?? 0), sub: `${summary?.refundedCount ?? 0} ${tr ? 'iade' : 'refunds'}`, Icon: RotateCcw, cls: 'text-violet-400' },
  ];

  const statusTabs = ['all', 'paid', 'initialized', 'failed', 'refunded', 'cancelled'];

  return (
    <div className="space-y-5">

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.label} className="stat-card">
            <div className="flex items-start justify-between">
              <div className="surface-soft p-2.5 rounded-xl"><c.Icon size={16} className={c.cls} /></div>
            </div>
            <div className="space-y-0.5 mt-2">
              <p className={`text-xl font-black tracking-tight tabular-nums leading-none ${c.cls}`}>{loading ? '—' : c.value}</p>
              <p className="text-xs font-medium text-muted">{c.label}</p>
            </div>
            <p className="text-[10px] text-subtle mt-1.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="tab-list">
            {statusTabs.map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${status === s ? 'bg-brand-accent/15 text-brand-accent border border-brand-accent/20' : 'text-muted hover:text-main border border-transparent hover:bg-m-hover'}`}>
                {s === 'all' ? (tr ? 'Tümü' : 'All') : (tr ? STATUS_STYLE[s]?.tr : STATUS_STYLE[s]?.en) ?? s}
              </button>
            ))}
          </div>
          <select value={provider} onChange={e => setProvider(e.target.value)} className="control-base px-2.5 py-1.5 text-xs appearance-none">
            <option value="all">{tr ? 'Tüm kaynaklar' : 'All sources'}</option>
            <option value="iyzico">iyzico (Online)</option>
            <option value="manual">{tr ? 'Manuel' : 'Manual'}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={tr ? 'Kod / misafir ara' : 'Search code / guest'} className="control-base pl-8 pr-3 py-1.5 text-xs w-44" />
          </div>
          <button onClick={() => setShowManual(true)} className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm">
            <Plus size={14} /> {tr ? 'Manuel Ödeme' : 'Manual Payment'}
          </button>
        </div>
      </div>

      {/* Transactions */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-brand-accent/50" /></div>
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-faint">
          <CreditCard size={30} />
          <p className="text-sm">{tr ? 'İşlem bulunamadı.' : 'No transactions found.'}</p>
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-m-border text-[10px] uppercase tracking-wider text-subtle">
                  <th className="text-left font-semibold px-4 py-2.5">{tr ? 'Tarih' : 'Date'}</th>
                  <th className="text-left font-semibold px-4 py-2.5">{tr ? 'Rezervasyon' : 'Reservation'}</th>
                  <th className="text-left font-semibold px-4 py-2.5">{tr ? 'Misafir' : 'Guest'}</th>
                  <th className="text-left font-semibold px-4 py-2.5">{tr ? 'Yöntem' : 'Method'}</th>
                  <th className="text-right font-semibold px-4 py-2.5">{tr ? 'Tutar' : 'Amount'}</th>
                  <th className="text-right font-semibold px-4 py-2.5">{tr ? 'Durum' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const st = STATUS_STYLE[p.status] ?? { tr: p.status, en: p.status, cls: 'text-subtle border-m-border bg-m-surface2' };
                  return (
                    <tr key={p.id} className="border-b border-m-border last:border-0 hover:bg-m-hover transition-colors">
                      <td className="px-4 py-2.5 text-[11px] text-subtle tabular-nums whitespace-nowrap">{fmt(p.paidAt ?? p.createdAt, tr)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-main">#{p.reservation.confirmationId}</td>
                      <td className="px-4 py-2.5 text-muted truncate max-w-[160px]">{p.reservation.firstName} {p.reservation.lastName}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-[11px] text-muted">{methodLabel(p, tr)}</span>
                        {p.provider === 'manual' && <span className="ml-1.5 text-[9px] text-subtle uppercase">· {tr ? 'manuel' : 'manual'}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-main tabular-nums whitespace-nowrap">{money(p.amount)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.cls}`}>{tr ? st.tr : st.en}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showManual && <ManualModal tr={tr} onClose={() => setShowManual(false)} onSaved={() => { setShowManual(false); fetchData(); }} />}
    </div>
  );
}
