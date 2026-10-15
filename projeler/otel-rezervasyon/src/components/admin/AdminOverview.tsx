'use client';

import { useState, useEffect } from 'react';
import {
  CalendarCheck, BedDouble, TrendingUp, LogIn, Wallet,
  Clock, Loader2,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import type { AuthUser } from '@/lib/auth/session';

// ── Types ────────────────────────────────────────────────────────────────────

interface OverviewStats {
  reservationsTotal: number;
  activeRooms: number;
  occupiedNow: number;
  occupancyRate: number;
  todayArrivals: number;
  todayDepartures: number;
  monthCollected: number;
}
interface RecentReservation {
  id: string; confirmationId: string; firstName: string; lastName: string;
  status: string; totalPrice: number; checkInDate: string; checkOutDate: string;
  room: { name: string; roomType: { name: string } };
}
interface ActivityRow {
  id: string; actorEmail: string | null; actorRole: string | null;
  action: string; summary: string; createdAt: string;
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'tag tag-success',
  pending: 'tag tag-warning',
  payment_pending: 'tag tag-warning',
  checked_in: 'tag tag-info',
  checked_out: 'tag tag-info',
  cancelled: 'tag tag-danger',
};
const STATUS_LABEL: Record<string, { tr: string; en: string }> = {
  confirmed: { tr: 'Onaylı', en: 'Confirmed' },
  pending: { tr: 'Beklemede', en: 'Pending' },
  payment_pending: { tr: 'Ödeme Bekliyor', en: 'Awaiting Payment' },
  checked_in: { tr: 'Giriş Yapıldı', en: 'Checked in' },
  checked_out: { tr: 'Çıkış Yapıldı', en: 'Checked out' },
  cancelled: { tr: 'İptal', en: 'Cancelled' },
};

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}
function fmtRange(ci: string, co: string, tr: boolean) {
  const a = new Date(ci); const b = new Date(co);
  const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${a.toLocaleDateString(tr ? 'tr-TR' : 'en-US', opt)} – ${b.toLocaleDateString(tr ? 'tr-TR' : 'en-US', opt)}`;
}
function fmtTime(iso: string, tr: boolean) {
  return new Date(iso).toLocaleString(tr ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Component ────────────────────────────────────────────────────────────────

export function AdminOverview({ user }: { user: AuthUser }) {
  const { language } = useLanguage();
  const tr = language === 'tr';
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [reservations, setReservations] = useState<RecentReservation[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/overview', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.ok) { setStats(d.stats); setReservations(d.recentReservations); setActivity(d.recentActivity); } })
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString(tr ? 'tr-TR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });

  const statCards = [
    { id: 'reservations', label: tr ? 'Toplam Rezervasyon' : 'Total Reservations', value: stats ? String(stats.reservationsTotal) : '—', sub: tr ? 'tüm zamanlar' : 'all time', Icon: CalendarCheck },
    { id: 'occupancy', label: tr ? 'Doluluk Oranı' : 'Occupancy Rate', value: stats ? `%${stats.occupancyRate}` : '—', sub: stats ? `${stats.occupiedNow}/${stats.activeRooms} ${tr ? 'oda dolu' : 'rooms'}` : '', Icon: TrendingUp },
    { id: 'today', label: tr ? 'Bugün Giriş / Çıkış' : "Today In / Out", value: stats ? `${stats.todayArrivals} / ${stats.todayDepartures}` : '—', sub: tr ? 'giriş / çıkış' : 'arrivals / departures', Icon: LogIn },
    { id: 'revenue', label: tr ? 'Bu Ay Tahsilat' : 'Collected This Month', value: stats ? `₺${stats.monthCollected.toLocaleString('tr-TR')}` : '—', sub: tr ? 'ödenen' : 'paid', Icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-main">{tr ? 'Hoş geldin 👋' : 'Welcome back 👋'}</h2>
        <p className="text-sm text-subtle mt-0.5 capitalize">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ id, label, value, sub, Icon }) => (
          <div key={id} className="stat-card">
            <div className="surface-soft p-3 rounded-xl w-fit"><Icon size={18} className="text-brand-accent" /></div>
            <div className="space-y-1 mt-2">
              <p className="text-3xl font-black text-main tracking-tight tabular-nums leading-none">{loading ? '—' : value}</p>
              <p className="text-xs font-medium text-muted">{label}</p>
            </div>
            <div className="pt-2.5 border-t border-m-border"><p className="text-[10px] text-subtle">{sub}</p></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_284px] gap-5">
        {/* Recent reservations */}
        <div className="panel-glass p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-main text-sm">{tr ? 'Son Rezervasyonlar' : 'Recent Reservations'}</h3>
              <p className="section-title mt-0.5">{tr ? 'En son eklenenler' : 'Latest added'}</p>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={18} className="animate-spin text-brand-accent/50" /></div>
          ) : reservations.length === 0 ? (
            <p className="text-sm text-subtle py-8 text-center">{tr ? 'Rezervasyon yok.' : 'No reservations.'}</p>
          ) : (
            <div>
              {reservations.map(r => (
                <div key={r.id} className="flex items-center gap-4 py-3 px-2 rounded-xl hover:bg-m-hover transition-colors border-b border-m-border last:border-0">
                  <div className="avatar-init w-9 h-9 text-[11px] shrink-0">{initials(r.firstName, r.lastName)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-main truncate leading-none">{r.firstName} {r.lastName}</p>
                    <p className="text-[11px] text-subtle mt-1 flex items-center gap-1.5">
                      <span>{r.room.name}</span><span className="text-faint">·</span><span>{fmtRange(r.checkInDate, r.checkOutDate, tr)}</span>
                    </p>
                  </div>
                  <span className={STATUS_STYLE[r.status] ?? 'tag'}>{(tr ? STATUS_LABEL[r.status]?.tr : STATUS_LABEL[r.status]?.en) ?? r.status}</span>
                  <span className="text-sm font-bold text-muted shrink-0 tabular-nums w-20 text-right">₺{r.totalPrice.toLocaleString('tr-TR')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity feed (audit log) */}
        <div className="panel-glass p-5">
          <div className="mb-4">
            <h3 className="font-bold text-main text-sm">{tr ? 'Son Aktivite' : 'Recent Activity'}</h3>
            <p className="section-title mt-0.5">{tr ? 'Sistem hareketleri' : 'System activity'}</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={18} className="animate-spin text-brand-accent/50" /></div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-subtle py-6 text-center">{tr ? 'Aktivite yok.' : 'No activity.'}</p>
          ) : (
            <div>
              {activity.map((a, i) => (
                <div key={a.id} className="flex gap-3 pb-4 last:pb-0">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="avatar-init w-8 h-8 text-[10px]" style={{ boxShadow: '0 0 0 3px var(--app-base)' }}>
                      {(a.actorRole?.[0] ?? a.actorEmail?.[0] ?? '?').toUpperCase()}
                    </div>
                    {i < activity.length - 1 && (
                      <div className="w-px flex-1 mt-2 min-h-[16px]" style={{ background: 'linear-gradient(to bottom, color-mix(in srgb, var(--app-accent) 25%, transparent), transparent)' }} />
                    )}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[12px] text-muted leading-relaxed">{a.summary}</p>
                    <p className="text-[10px] text-subtle mt-1 flex items-center gap-1.5">
                      <Clock size={9} />{fmtTime(a.createdAt, tr)}
                      {a.actorEmail && <><span className="text-faint">·</span><span className="truncate">{a.actorEmail}</span></>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
