'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, Clock, Loader2, Sparkles, AlertTriangle, Package,
  X, Check, Hand, RotateCcw, Trophy, LayoutGrid, Crown,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

interface TaskRoom { id: string; name: string; floor: number | null }
interface TaskUser { id: string; firstName: string | null; lastName: string | null; email: string }
interface CleaningTask {
  id: string;
  room: TaskRoom;
  assignedTo: TaskUser | null;
  reportedBy: TaskUser;
  status: string;
  priority: string;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
}
interface RoomRow { id: string; name: string; floor: number | null; status: string }
interface CleanerStat { id: string; name: string; total: number; today: number }

interface Props { tr: boolean }

const ROOM_STATUS: Record<string, { tr: string; en: string; dot: string; cls: string }> = {
  available:   { tr: 'Müsait',       en: 'Available',   dot: 'bg-emerald-400', cls: 'text-emerald-400 border-emerald-500/25 bg-emerald-500/5' },
  occupied:    { tr: 'Dolu',         en: 'Occupied',    dot: 'bg-sky-400',     cls: 'text-sky-400 border-sky-500/25 bg-sky-500/5' },
  dirty:       { tr: 'Temizlenecek', en: 'Dirty',       dot: 'bg-amber-400',   cls: 'text-amber-400 border-amber-500/25 bg-amber-500/5' },
  cleaning:    { tr: 'Temizleniyor', en: 'Cleaning',    dot: 'bg-sky-400',     cls: 'text-sky-400 border-sky-500/25 bg-sky-500/5' },
  maintenance: { tr: 'Bakım',        en: 'Maintenance', dot: 'bg-red-400',     cls: 'text-red-400 border-red-500/25 bg-red-500/5' },
};

function userName(u: TaskUser | null, tr: boolean) {
  if (!u) return tr ? 'Atanmamış' : 'Unassigned';
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
}

function fmtTime(iso: string, tr: boolean) {
  return new Date(iso).toLocaleTimeString(tr ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
}

export function TaskList({ tr }: Props) {
  const toast = useToast();
  const [pool, setPool]   = useState<CleaningTask[]>([]);
  const [mine, setMine]   = useState<CleaningTask[]>([]);
  const [done, setDone]   = useState<CleaningTask[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [stats, setStats] = useState<CleanerStat[]>([]);
  const [meId, setMeId]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId]   = useState<string | null>(null);

  const [lostItemTaskId, setLostItemTaskId] = useState<string | null>(null);
  const [lostItemDesc, setLostItemDesc]     = useState('');
  const [savingLostItem, setSavingLostItem] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cleaning', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setPool(data.pool ?? []);
        setMine(data.mine ?? []);
        setDone(data.completedToday ?? []);
        setRooms(data.rooms ?? []);
        setStats(data.stats ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.ok) setMeId(d.user.id); }).catch(() => null);
    fetchData();
  }, [fetchData]);

  async function act(taskId: string, action: 'claim' | 'complete' | 'release', successMsg: string) {
    setBusyId(taskId);
    try {
      const res = await fetch(`/api/cleaning/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      toast.success(successMsg);
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (tr ? 'Hata.' : 'Error.'));
    } finally {
      setBusyId(null);
    }
  }

  async function submitLostItem(task: CleaningTask) {
    if (!lostItemDesc.trim()) { toast.error(tr ? 'Açıklama zorunludur.' : 'Description is required.'); return; }
    setSavingLostItem(true);
    try {
      const res = await fetch('/api/lost-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: task.room.id, description: lostItemDesc.trim() }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setLostItemTaskId(null);
      setLostItemDesc('');
      toast.success(tr ? 'Kayıp eşya kaydedildi.' : 'Lost item recorded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (tr ? 'Hata.' : 'Error.'));
    } finally {
      setSavingLostItem(false);
    }
  }

  const myDoneToday = meId ? done.filter(t => t.assignedTo?.id === meId).length : 0;
  const dirtyRooms = rooms.filter(r => r.status === 'dirty' || r.status === 'cleaning').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-brand-accent/50" />
      </div>
    );
  }

  const headStats = [
    { label: tr ? 'Havuzda Bekleyen' : 'Waiting in Pool', value: pool.length, cls: 'text-amber-400' },
    { label: tr ? 'Üzerimde'         : 'On Me',           value: mine.length, cls: 'text-sky-400' },
    { label: tr ? 'Bugün Yaptığım'   : 'Done Today (Me)', value: myDoneToday, cls: 'text-emerald-400' },
    { label: tr ? 'Kirli Oda'        : 'Dirty Rooms',     value: dirtyRooms,  cls: 'text-white/70' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {headStats.map(s => (
          <div key={s.label} className="surface-card px-3 py-3">
            <p className={`text-2xl font-black tabular-nums leading-none ${s.cls}`}>{s.value}</p>
            <p className="text-[10px] text-subtle mt-1.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── My active tasks ── */}
      {mine.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] text-subtle uppercase tracking-widest px-1 flex items-center gap-1.5">
            <Hand size={11} className="text-sky-400" /> {tr ? 'Üzerimdeki Görevler' : 'My Active Tasks'}
          </p>
          {mine.map(task => {
            const isBusy = busyId === task.id;
            return (
              <div key={task.id} className={`rounded-2xl border px-4 py-4 ${task.priority === 'urgent' ? 'border-red-500/25 bg-red-500/[0.04]' : 'border-sky-500/20 bg-sky-500/[0.03]'}`}>
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.priority === 'urgent' && <AlertTriangle size={12} className="text-red-400 shrink-0" />}
                      <span className="text-sm font-bold text-main">
                        {task.room.name}
                        {task.room.floor != null && <span className="text-subtle font-normal ml-1.5 text-xs">· Kat {task.room.floor}</span>}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-sky-400 border-sky-500/20 bg-sky-500/8">
                        {tr ? 'Temizleniyor' : 'In Progress'}
                      </span>
                    </div>
                    {task.notes && <p className="text-[11px] text-muted mt-1.5 italic">&quot;{task.notes}&quot;</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isBusy ? <Loader2 size={16} className="animate-spin text-subtle" /> : (
                      <>
                        <button
                          onClick={() => { setLostItemTaskId(lostItemTaskId === task.id ? null : task.id); setLostItemDesc(''); }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${lostItemTaskId === task.id ? 'text-amber-400 border border-amber-400/30 bg-amber-400/12' : 'text-amber-400/60 border border-amber-400/15 bg-amber-400/4 hover:bg-amber-400/10 hover:text-amber-400'}`}
                        >
                          <Package size={11} /> {tr ? 'Kayıp Eşya' : 'Lost Item'}
                        </button>
                        <button
                          onClick={() => act(task.id, 'release', tr ? 'Görev havuza bırakıldı.' : 'Released to pool.')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-subtle border border-m-border bg-m-surface hover:bg-m-hover transition-colors"
                        >
                          <RotateCcw size={11} /> {tr ? 'Bırak' : 'Release'}
                        </button>
                        <button
                          onClick={() => act(task.id, 'complete', tr ? 'Görev tamamlandı! Oda müsait.' : 'Done! Room available.')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 border border-emerald-400/20 bg-emerald-400/6 hover:bg-emerald-400/12 transition-colors"
                        >
                          <CheckCircle2 size={11} /> {tr ? 'Bitti' : 'Done'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {lostItemTaskId === task.id && (
                  <div className="mt-3 pt-3 border-t border-m-border space-y-2">
                    <textarea
                      value={lostItemDesc}
                      onChange={e => setLostItemDesc(e.target.value)}
                      rows={2}
                      placeholder={tr ? 'Eşyanın tanımı (renk, marka, tür...)' : 'Item description...'}
                      className="control-base px-3 py-2 text-xs resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => submitLostItem(task)} disabled={savingLostItem} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 border border-emerald-400/20 bg-emerald-400/6 hover:bg-emerald-400/12 transition-colors">
                        {savingLostItem ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} {tr ? 'Kaydet' : 'Save'}
                      </button>
                      <button onClick={() => { setLostItemTaskId(null); setLostItemDesc(''); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted border border-m-border hover:bg-m-hover transition-colors">
                        <X size={10} /> {tr ? 'İptal' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* ── Pool ── */}
      <section className="space-y-2">
        <p className="text-[10px] text-subtle uppercase tracking-widest px-1 flex items-center gap-1.5">
          <Sparkles size={11} className="text-amber-400" /> {tr ? 'Görev Havuzu' : 'Task Pool'}
        </p>
        {pool.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-faint border border-dashed border-m-border rounded-2xl">
            <Sparkles size={26} />
            <p className="text-sm">{tr ? 'Havuzda bekleyen görev yok.' : 'No tasks waiting in the pool.'}</p>
          </div>
        ) : (
          [...pool]
            .sort((a, b) => (b.priority === 'urgent' ? 1 : 0) - (a.priority === 'urgent' ? 1 : 0))
            .map(task => {
              const isBusy = busyId === task.id;
              return (
                <div key={task.id} className={`rounded-2xl border px-4 py-4 ${task.priority === 'urgent' ? 'border-red-500/25 bg-red-500/[0.04]' : 'border-m-border bg-m-surface'}`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {task.priority === 'urgent' && <AlertTriangle size={12} className="text-red-400 shrink-0" />}
                        <span className="text-sm font-bold text-main">
                          {task.room.name}
                          {task.room.floor != null && <span className="text-subtle font-normal ml-1.5 text-xs">· Kat {task.room.floor}</span>}
                        </span>
                        {task.priority === 'urgent' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-red-400 border-red-500/20 bg-red-500/8">{tr ? 'Acil' : 'Urgent'}</span>
                        )}
                      </div>
                      {task.notes && <p className="text-[11px] text-muted mt-1.5 italic">&quot;{task.notes}&quot;</p>}
                      <p className="text-[10px] text-subtle mt-1.5 tabular-nums">{fmtTime(task.createdAt, tr)}</p>
                    </div>
                    <button
                      onClick={() => act(task.id, 'claim', tr ? 'Görevi aldınız.' : 'Task claimed.')}
                      disabled={isBusy}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-brand-emerald bg-brand-accent hover:brightness-105 transition-all shrink-0 disabled:opacity-50"
                    >
                      {isBusy ? <Loader2 size={12} className="animate-spin" /> : <Hand size={12} />} {tr ? 'Görevi Al' : 'Claim'}
                    </button>
                  </div>
                </div>
              );
            })
        )}
      </section>

      {/* ── Room matrix (read-only) ── */}
      <section className="space-y-2">
        <p className="text-[10px] text-subtle uppercase tracking-widest px-1 flex items-center gap-1.5">
          <LayoutGrid size={11} className="text-white/50" /> {tr ? 'Oda Durumu' : 'Room Status'}
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {rooms.map(r => {
            const s = ROOM_STATUS[r.status] ?? ROOM_STATUS.available;
            return (
              <div key={r.id} className={`rounded-xl border px-3 py-2.5 ${s.cls}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-main">{r.name}</span>
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                </div>
                <p className="text-[10px] mt-1 font-medium">{tr ? s.tr : s.en}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Completed today ── */}
      {done.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] text-subtle uppercase tracking-widest px-1 flex items-center gap-1.5">
            <CheckCircle2 size={11} className="text-emerald-400" /> {tr ? 'Bugün Tamamlananlar' : 'Completed Today'}
          </p>
          <div className="space-y-1.5">
            {done.map(task => (
              <div key={task.id} className="flex items-center gap-3 rounded-xl border border-m-border bg-m-surface/50 px-3 py-2 opacity-80">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span className="text-sm font-semibold text-main">{task.room.name}</span>
                <span className="text-[11px] text-subtle">{userName(task.assignedTo, tr)}</span>
                {task.completedAt && (
                  <span className="text-[10px] text-subtle tabular-nums ml-auto inline-flex items-center gap-1">
                    <Clock size={9} />{fmtTime(task.completedAt, tr)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Team performance ── */}
      {stats.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] text-subtle uppercase tracking-widest px-1 flex items-center gap-1.5">
            <Trophy size={11} className="text-amber-400" /> {tr ? 'Ekip Performansı' : 'Team Performance'}
          </p>
          <div className="space-y-1.5">
            {stats.map((s, i) => (
              <div key={s.id} className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${s.id === meId ? 'border-brand-accent/30 bg-brand-accent/8' : 'border-m-border bg-m-surface'}`}>
                <span className="w-6 text-center text-sm font-black tabular-nums text-subtle">
                  {i === 0 ? <Crown size={14} className="text-amber-400 inline" /> : i + 1}
                </span>
                <span className="text-sm font-semibold text-main flex-1 truncate">
                  {s.name}{s.id === meId && <span className="text-[10px] text-brand-accent ml-1.5">({tr ? 'Sen' : 'You'})</span>}
                </span>
                <span className="text-[11px] text-subtle">{tr ? 'Bugün' : 'Today'}: <strong className="text-emerald-400">{s.today}</strong></span>
                <span className="text-[11px] text-subtle">{tr ? 'Toplam' : 'Total'}: <strong className="text-main">{s.total}</strong></span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
