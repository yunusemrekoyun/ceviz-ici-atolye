'use client';

import { useState, useEffect } from 'react';
import {
  Loader2, Wallet, TrendingUp, CalendarDays, RotateCcw, Scale,
  CreditCard, BarChart3,
} from 'lucide-react';

interface Props { tr: boolean }

interface PaymentRow {
  id: string; provider: string; method: string | null; status: string;
  amount: number; paidAt: string | null; createdAt: string;
  reservation: { confirmationId: string; firstName: string; lastName: string };
}
interface Summary {
  totalPaid: number; todayPaid: number; monthPaid: number; refundedTotal: number;
}

const STATUS: Record<string, { tr: string; en: string; cls: string }> = {
  paid:          { tr: 'Ödendi', en: 'Paid', cls: 'text-emerald-400' },
  refunded:      { tr: 'İade', en: 'Refunded', cls: 'text-violet-400' },
  refund_failed: { tr: 'İade Hatası', en: 'Refund Failed', cls: 'text-red-400' },
  failed:        { tr: 'Başarısız', en: 'Failed', cls: 'text-red-400' },
  cancelled:     { tr: 'İptal', en: 'Cancelled', cls: 'text-zinc-400' },
  expired:       { tr: 'Süresi Doldu', en: 'Expired', cls: 'text-zinc-400' },
  initialized:   { tr: 'Bekliyor', en: 'Pending', cls: 'text-amber-400' },
  partial:       { tr: 'Kısmi', en: 'Partial', cls: 'text-amber-400' },
};

function money(n: number) { return `₺${n.toLocaleString('tr-TR')}`; }
function fmt(iso: string | null, tr: boolean) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(tr ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function methodText(p: PaymentRow, tr: boolean) {
  const m = p.method ?? (p.provider === 'iyzico' ? 'online' : null);
  const map: Record<string, { tr: string; en: string }> = {
    cash: { tr: 'Nakit', en: 'Cash' }, card: { tr: 'Kart', en: 'Card' },
    transfer: { tr: 'Havale', en: 'Transfer' }, online: { tr: 'Online', en: 'Online' },
  };
  return m ? (tr ? map[m]?.tr : map[m]?.en) ?? m : '—';
}

// ── Financial summary + recent transactions ─────────────────────────────────

export function MuhasebeDashboard({ tr }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/payments', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.ok) { setSummary(d.summary); setPayments(d.payments); } })
      .finally(() => setLoading(false));
  }, []);

  const net = (summary?.totalPaid ?? 0) - (summary?.refundedTotal ?? 0);
  const cards = [
    { label: tr ? 'Bugün Tahsilat' : 'Collected Today', value: summary?.todayPaid ?? 0, Icon: CalendarDays, cls: 'text-emerald-400' },
    { label: tr ? 'Bu Ay' : 'This Month', value: summary?.monthPaid ?? 0, Icon: TrendingUp, cls: 'text-sky-400' },
    { label: tr ? 'Toplam Tahsilat' : 'Total Collected', value: summary?.totalPaid ?? 0, Icon: Wallet, cls: 'text-brand-accent' },
    { label: tr ? 'Toplam İade' : 'Total Refunded', value: summary?.refundedTotal ?? 0, Icon: RotateCcw, cls: 'text-violet-400' },
    { label: tr ? 'Net Gelir' : 'Net Revenue', value: net, Icon: Scale, cls: 'text-main' },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map(c => (
          <div key={c.label} className="stat-card">
            <div className="surface-soft p-2.5 rounded-xl w-fit"><c.Icon size={16} className={c.cls} /></div>
            <p className={`text-xl font-black tabular-nums leading-none mt-2 ${c.cls}`}>{loading ? '—' : money(c.value)}</p>
            <p className="text-xs font-medium text-muted mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-main mb-3 flex items-center gap-2"><CreditCard size={15} className="text-brand-accent" /> {tr ? 'Son İşlemler' : 'Recent Transactions'}</h3>
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-brand-accent/50" /></div>
        ) : payments.length === 0 ? (
          <p className="text-sm text-subtle py-8 text-center">{tr ? 'İşlem yok.' : 'No transactions.'}</p>
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
                  {payments.slice(0, 20).map(p => {
                    const st = STATUS[p.status] ?? { tr: p.status, en: p.status, cls: 'text-subtle' };
                    return (
                      <tr key={p.id} className="border-b border-m-border last:border-0">
                        <td className="px-4 py-2.5 text-[11px] text-subtle tabular-nums whitespace-nowrap">{fmt(p.paidAt ?? p.createdAt, tr)}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-main">#{p.reservation.confirmationId}</td>
                        <td className="px-4 py-2.5 text-muted truncate max-w-[160px]">{p.reservation.firstName} {p.reservation.lastName}</td>
                        <td className="px-4 py-2.5 text-[11px] text-muted">{methodText(p, tr)}{p.provider === 'manual' && <span className="ml-1 text-[9px] text-subtle uppercase">· {tr ? 'manuel' : 'manual'}</span>}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-main tabular-nums whitespace-nowrap">{money(p.amount)}</td>
                        <td className={`px-4 py-2.5 text-right text-[11px] font-semibold ${st.cls}`}>{tr ? st.tr : st.en}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Period revenue report ────────────────────────────────────────────────────

interface RevenuePoint { collected: number; refunded: number }
interface RevenueData {
  totals: { collected: number; refunded: number; net: number };
  daily: ({ date: string } & RevenuePoint)[];
  monthly: ({ month: string } & RevenuePoint)[];
}

export function MuhasebeReports({ tr }: Props) {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports/revenue', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.ok) setData({ totals: d.totals, daily: d.daily, monthly: d.monthly }); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-brand-accent/50" /></div>;
  if (!data) return <p className="text-sm text-subtle">{tr ? 'Veri alınamadı.' : 'No data.'}</p>;

  const maxMonthly = Math.max(1, ...data.monthly.map(m => m.collected));
  const monthLabel = (k: string) => {
    const [y, m] = k.split('-');
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(tr ? 'tr-TR' : 'en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: tr ? 'Toplam Tahsilat (12 ay)' : 'Collected (12m)', value: data.totals.collected, cls: 'text-emerald-400' },
          { label: tr ? 'Toplam İade' : 'Refunded', value: data.totals.refunded, cls: 'text-violet-400' },
          { label: tr ? 'Net Gelir' : 'Net', value: data.totals.net, cls: 'text-brand-accent' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <p className={`text-2xl font-black tabular-nums leading-none ${c.cls}`}>{money(c.value)}</p>
            <p className="text-xs text-muted mt-1.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly bars */}
      <div className="surface-card p-5">
        <h3 className="text-sm font-semibold text-main mb-4 flex items-center gap-2"><BarChart3 size={15} className="text-brand-accent" /> {tr ? 'Aylık Tahsilat (Son 12 Ay)' : 'Monthly Revenue (12m)'}</h3>
        <div className="space-y-2">
          {data.monthly.map(m => (
            <div key={m.month} className="flex items-center gap-3">
              <span className="w-14 text-[10px] text-subtle tabular-nums shrink-0">{monthLabel(m.month)}</span>
              <div className="flex-1 h-5 rounded-md bg-m-surface2 overflow-hidden relative">
                <div className="h-full rounded-md bg-brand-accent/70" style={{ width: `${Math.round((m.collected / maxMonthly) * 100)}%` }} />
              </div>
              <span className="w-24 text-right text-xs font-semibold text-main tabular-nums shrink-0">{money(m.collected)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly table with refunds/net */}
      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-m-border text-[10px] uppercase tracking-wider text-subtle">
                <th className="text-left font-semibold px-4 py-2.5">{tr ? 'Ay' : 'Month'}</th>
                <th className="text-right font-semibold px-4 py-2.5">{tr ? 'Tahsilat' : 'Collected'}</th>
                <th className="text-right font-semibold px-4 py-2.5">{tr ? 'İade' : 'Refunded'}</th>
                <th className="text-right font-semibold px-4 py-2.5">{tr ? 'Net' : 'Net'}</th>
              </tr>
            </thead>
            <tbody>
              {[...data.monthly].reverse().map(m => (
                <tr key={m.month} className="border-b border-m-border last:border-0">
                  <td className="px-4 py-2.5 text-muted">{monthLabel(m.month)}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-400 tabular-nums">{money(m.collected)}</td>
                  <td className="px-4 py-2.5 text-right text-violet-400 tabular-nums">{m.refunded ? `−${money(m.refunded)}` : '—'}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-main tabular-nums">{money(m.collected - m.refunded)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
