'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Package, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Room   { id: string; name: string; floor: number | null }
interface Person { id: string; firstName: string | null; lastName: string | null; email: string }

interface MaintenanceReport {
  id: string;
  room: Room;
  reportedBy: Person;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
}

interface LostItem {
  id: string;
  room: Room;
  foundBy: Person;
  description: string;
  status: string;
  foundAt: string;
}

type SubTab = 'maintenance' | 'lostitems';
interface Props { tr: boolean }

// ── Helpers ───────────────────────────────────────────────────────────────────

function personName(p: Person) {
  return p.firstName && p.lastName ? `${p.firstName} ${p.lastName}` : p.email;
}

const LOST_STATUSES = [
  { id: 'found',     labelTr: 'Depoda',       labelEn: 'In Storage', cls: 'text-sky-400 border-sky-400/20 bg-sky-400/6'          },
  { id: 'claimed',   labelTr: 'Teslim Edildi', labelEn: 'Claimed',   cls: 'text-emerald-400 border-emerald-400/20 bg-emerald-400/8' },
  { id: 'discarded', labelTr: 'İmha Edildi',   labelEn: 'Discarded', cls: 'text-muted border-m-border bg-m-surface2'         },
];

// ── Status Dropdown for Lost Items ────────────────────────────────────────────

function LostStatusSelect({ item, tr, onUpdate }: {
  item: LostItem;
  tr: boolean;
  onUpdate: (id: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = LOST_STATUSES.find(s => s.id === item.status) ?? LOST_STATUSES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${current.cls}`}
      >
        {tr ? current.labelTr : current.labelEn}
        <ChevronDown size={9} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-36 modal-shell overflow-hidden">
          {LOST_STATUSES.map(s => (
            <button
              key={s.id}
              onClick={() => { onUpdate(item.id, s.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-[11px] font-medium transition-colors hover:bg-m-hover ${
                s.id === item.status ? 'text-main' : 'text-muted'
              }`}
            >
              {tr ? s.labelTr : s.labelEn}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function AdminOperationsPanel({ tr }: Props) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<SubTab>('maintenance');
  const [reports, setReports]     = useState<MaintenanceReport[]>([]);
  const [items, setItems]         = useState<LostItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId]   = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, lRes] = await Promise.all([
        fetch('/api/maintenance', { credentials: 'include' }),
        fetch('/api/lost-items',  { credentials: 'include' }),
      ]);
      const [md, ld] = await Promise.all([mRes.json(), lRes.json()]);
      if (md.ok) setReports(md.reports);
      if (ld.ok) setItems(ld.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function resolveReport(id: string) {
    setResolvingId(id);
    try {
      const res = await fetch(`/api/maintenance/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setReports(prev => prev.map(r => r.id === id ? data.report : r));
      toast.success(tr ? 'Hasar raporu çözüldü olarak işaretlendi.' : 'Report marked as resolved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (tr ? 'Hata.' : 'Error.'));
    } finally {
      setResolvingId(null);
    }
  }

  async function updateLostStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/lost-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setItems(prev => prev.map(i => i.id === id ? data.item : i));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (tr ? 'Hata.' : 'Error.'));
    } finally {
      setUpdatingId(null);
    }
  }

  const openReports  = reports.filter(r => r.status === 'open');
  const closedReports = reports.filter(r => r.status !== 'open');
  const activeItems  = items.filter(i => i.status === 'found');
  const pastItems    = items.filter(i => i.status !== 'found');

  return (
    <div className="space-y-4">

      {/* Sub-tab bar */}
      <div className="tab-list w-fit">
        {([
          { id: 'maintenance' as SubTab, labelTr: 'Hasar Bildirimleri', labelEn: 'Damage Reports', icon: AlertTriangle,
            count: openReports.length },
          { id: 'lostitems'   as SubTab, labelTr: 'Kayıp Eşyalar',      labelEn: 'Lost Items',     icon: Package,
            count: activeItems.length },
        ]).map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                isActive ? 'bg-brand-accent text-black shadow-sm' : 'text-muted hover:text-main hover:bg-m-hover'
              }`}
            >
              <Icon size={12} />
              {tr ? t.labelTr : t.labelEn}
              {t.count > 0 && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-black/20 text-black' : 'bg-m-surface2 text-muted'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-brand-accent/50" />
        </div>
      ) : activeTab === 'maintenance' ? (
        /* ── Hasar Bildirimleri ── */
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: tr ? 'Açık'    : 'Open',     value: openReports.length,   cls: 'text-amber-400'   },
              { label: tr ? 'Acil'    : 'Urgent',   value: reports.filter(r => r.priority === 'urgent' && r.status === 'open').length, cls: 'text-red-400' },
              { label: tr ? 'Çözüldü' : 'Resolved', value: closedReports.length, cls: 'text-emerald-400' },
            ].map(s => (
              <div key={s.label} className="surface-card px-3 py-2.5">
                <p className={`text-xl font-black tabular-nums leading-none ${s.cls}`}>{s.value}</p>
                <p className="text-[10px] text-subtle mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-faint">
              <AlertTriangle size={32} />
              <p className="text-sm">{tr ? 'Hasar bildirimi yok.' : 'No damage reports.'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Open reports first */}
              {[...openReports.sort((a, b) => (b.priority === 'urgent' ? 1 : 0) - (a.priority === 'urgent' ? 1 : 0)), ...closedReports].map(r => (
                <div
                  key={r.id}
                  className={`rounded-2xl border px-4 py-3.5 transition-all ${
                    r.status !== 'open'   ? 'opacity-60 border-m-border bg-m-surface' :
                    r.priority === 'urgent' ? 'border-red-500/20 bg-red-500/[0.04]'     :
                    'border-m-border bg-m-surface'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.priority === 'urgent' && r.status === 'open' && (
                          <AlertTriangle size={11} className="text-red-400 shrink-0" />
                        )}
                        <span className="text-sm font-bold text-main">
                          {r.room.name}
                          {r.room.floor != null && <span className="text-xs text-subtle font-normal ml-1.5">· Kat {r.room.floor}</span>}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          r.status === 'resolved'
                            ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/8'
                            : r.priority === 'urgent'
                              ? 'text-red-400 border-red-500/20 bg-red-500/8'
                              : 'text-amber-400 border-amber-400/20 bg-amber-400/6'
                        }`}>
                          {r.status === 'resolved'
                            ? (tr ? 'Çözüldü' : 'Resolved')
                            : r.priority === 'urgent'
                              ? (tr ? 'Acil'   : 'Urgent')
                              : (tr ? 'Açık'   : 'Open')}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted mt-1.5 leading-relaxed">{r.description}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-[10px] text-subtle tabular-nums">
                          {new Date(r.createdAt).toLocaleDateString(tr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </p>
                        <span className="text-faint">·</span>
                        <p className="text-[10px] text-subtle">{personName(r.reportedBy)}</p>
                      </div>
                    </div>

                    {r.status === 'open' && (
                      <button
                        onClick={() => resolveReport(r.id)}
                        disabled={resolvingId === r.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 border border-emerald-400/20 bg-emerald-400/6 hover:bg-emerald-400/12 transition-colors shrink-0"
                      >
                        {resolvingId === r.id
                          ? <Loader2 size={11} className="animate-spin" />
                          : <CheckCircle2 size={11} />}
                        {tr ? 'Çözüldü' : 'Resolve'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Kayıp Eşyalar ── */
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: tr ? 'Depoda'       : 'In Storage', value: activeItems.length,                         cls: 'text-sky-400'     },
              { label: tr ? 'Teslim'       : 'Claimed',   value: items.filter(i => i.status === 'claimed').length,  cls: 'text-emerald-400' },
              { label: tr ? 'İmha'         : 'Discarded', value: items.filter(i => i.status === 'discarded').length, cls: 'text-muted'    },
            ].map(s => (
              <div key={s.label} className="surface-card px-3 py-2.5">
                <p className={`text-xl font-black tabular-nums leading-none ${s.cls}`}>{s.value}</p>
                <p className="text-[10px] text-subtle mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-faint">
              <Package size={32} />
              <p className="text-sm">{tr ? 'Kayıp eşya kaydı yok.' : 'No lost items logged.'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...activeItems, ...pastItems].map(item => (
                <div
                  key={item.id}
                  className={`rounded-2xl border px-4 py-3.5 ${
                    item.status !== 'found' ? 'opacity-60 border-m-border bg-m-surface' : 'border-m-border bg-m-surface'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-main">
                          {item.room.name}
                          {item.room.floor != null && <span className="text-xs text-subtle font-normal ml-1.5">· Kat {item.room.floor}</span>}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted mt-1.5 leading-relaxed">{item.description}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <p className="text-[10px] text-subtle tabular-nums">
                          {new Date(item.foundAt).toLocaleDateString(tr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </p>
                        <span className="text-faint">·</span>
                        <p className="text-[10px] text-subtle">{personName(item.foundBy)}</p>
                      </div>
                    </div>

                    <div className="relative">
                      {updatingId === item.id ? (
                        <Loader2 size={14} className="animate-spin text-subtle" />
                      ) : (
                        <LostStatusSelect item={item} tr={tr} onUpdate={updateLostStatus} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
