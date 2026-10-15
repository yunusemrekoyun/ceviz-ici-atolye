'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Plus, Trash2, Loader2, CheckCircle2, Clock,
  AlertTriangle, ChevronDown, User, DoorOpen, X, Check,
} from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoomOption { id: string; name: string; floor: number | null; status: string }
interface StaffOption { id: string; firstName: string | null; lastName: string | null; email: string }
interface TaskUser  { id: string; firstName: string | null; lastName: string | null; email: string }
interface TaskRoom  { id: string; name: string; floor: number | null }

interface CleaningTask {
  id: string;
  roomId: string;
  room: TaskRoom;
  assignedTo: TaskUser | null;
  reportedBy: TaskUser;
  status: string;
  priority: string;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
}

interface Props { tr: boolean }

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { dot: string; label: string; labelEn: string }> = {
  pending:     { dot: 'bg-amber-400',   label: 'Bekliyor',    labelEn: 'Pending'     },
  in_progress: { dot: 'bg-sky-400',     label: 'Devam Ediyor', labelEn: 'In Progress' },
  done:        { dot: 'bg-emerald-400', label: 'Tamamlandı',  labelEn: 'Done'        },
};

const PRIORITY_STYLE: Record<string, { cls: string; label: string; labelEn: string }> = {
  normal: { cls: 'text-muted border-m-border bg-m-surface2', label: 'Normal',  labelEn: 'Normal'  },
  urgent: { cls: 'text-red-400  border-red-500/20 bg-red-500/8',   label: 'Acil',    labelEn: 'Urgent'  },
};

function displayName(u: TaskUser | StaffOption | null) {
  if (!u) return '—';
  const full = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return full || u.email;
}

// ── CreateModal ───────────────────────────────────────────────────────────────

function CreateModal({
  tr, rooms, staff, onClose, onCreate,
}: {
  tr: boolean;
  rooms: RoomOption[];
  staff: StaffOption[];
  onClose: () => void;
  onCreate: (task: CleaningTask) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    roomId: '',
    assignedToId: '',
    priority: 'normal',
    notes: '',
  });

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleCreate() {
    if (!form.roomId) { toast.error(tr ? 'Oda seçin.' : 'Select a room.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/cleaning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, assignedToId: form.assignedToId || null }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      toast.success(tr ? 'Görev oluşturuldu.' : 'Task created.');
      onCreate(data.task);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (tr ? 'Hata.' : 'Error.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
      <div
        className="w-full max-w-md modal-shell"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-m-border rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <Sparkles size={14} className="text-amber-400" />
            </div>
            <p className="text-sm font-bold text-main">{tr ? 'Temizlik Görevi Oluştur' : 'Create Cleaning Task'}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-subtle hover:text-main hover:bg-m-hover transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Room */}
          <div>
            <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'Oda *' : 'Room *'}</label>
            <select
              value={form.roomId}
              onChange={e => set('roomId', e.target.value)}
              className="control-base px-3 py-2 text-sm appearance-none"
            >
              <option value="">{tr ? '— Oda seçin —' : '— Select room —'}</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name}{r.floor != null ? ` · Kat ${r.floor}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Assign */}
          <div>
            <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'Atanan Kişi' : 'Assigned To'}</label>
            <select
              value={form.assignedToId}
              onChange={e => set('assignedToId', e.target.value)}
              className="control-base px-3 py-2 text-sm appearance-none"
            >
              <option value="">{tr ? '— Atanmamış —' : '— Unassigned —'}</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{displayName(s)}</option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'Öncelik' : 'Priority'}</label>
            <div className="flex gap-2">
              {(['normal', 'urgent'] as const).map(p => {
                const s = PRIORITY_STYLE[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set('priority', p)}
                    className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all ${form.priority === p ? s.cls : 'text-subtle border-m-border bg-transparent'}`}
                  >
                    {tr ? s.label : s.labelEn}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'Not' : 'Notes'}</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              placeholder={tr ? 'İsteğe bağlı açıklama...' : 'Optional note...'}
              className="control-base px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2.5 px-5 pb-5">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">{tr ? 'İptal' : 'Cancel'}</button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {tr ? 'Oluştur' : 'Create'}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CleaningManager({ tr }: Props) {
  const toast = useToast();

  const [tasks, setTasks]         = useState<CleaningTask[]>([]);
  const [rooms, setRooms]         = useState<RoomOption[]>([]);
  const [staff, setStaff]         = useState<StaffOption[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter]       = useState<'all' | 'pending' | 'in_progress' | 'done'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, roomsRes, usersRes] = await Promise.all([
        fetch('/api/cleaning', { credentials: 'include' }),
        fetch('/api/rooms', { credentials: 'include' }),
        fetch('/api/users', { credentials: 'include' }),
      ]);
      const [td, rd, ud] = await Promise.all([tasksRes.json(), roomsRes.json(), usersRes.json()]);
      if (td.ok) setTasks(td.tasks);
      if (rd.ok) setRooms(rd.rooms);
      if (ud.ok) setStaff(ud.users.filter((u: { role: { slug: string } }) => u.role.slug === 'temizlikci'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const stats = [
    { label: tr ? 'Toplam'       : 'Total',       value: tasks.length,                                    cls: 'text-white/60' },
    { label: tr ? 'Bekliyor'     : 'Pending',      value: tasks.filter(t => t.status === 'pending').length,     cls: 'text-amber-400' },
    { label: tr ? 'Devam Ediyor' : 'In Progress',  value: tasks.filter(t => t.status === 'in_progress').length, cls: 'text-sky-400' },
    { label: tr ? 'Tamamlandı'   : 'Done',         value: tasks.filter(t => t.status === 'done').length,        cls: 'text-emerald-400' },
  ];

  async function updateStatus(task: CleaningTask, status: string) {
    setUpdatingId(task.id);
    try {
      const res = await fetch(`/api/cleaning/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setTasks(prev => prev.map(t => t.id === task.id ? data.task : t));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (tr ? 'Hata.' : 'Error.'));
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteTask(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/cleaning/${id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setTasks(prev => prev.filter(t => t.id !== id));
      toast.success(tr ? 'Görev silindi.' : 'Task deleted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (tr ? 'Hata.' : 'Error.'));
    } finally {
      setDeletingId(null);
    }
  }

  const filterTabs: { id: typeof filter; label: string }[] = [
    { id: 'all',         label: tr ? 'Tümü'         : 'All'         },
    { id: 'pending',     label: tr ? 'Bekliyor'     : 'Pending'     },
    { id: 'in_progress', label: tr ? 'Devam Ediyor' : 'In Progress' },
    { id: 'done',        label: tr ? 'Tamamlandı'   : 'Done'        },
  ];

  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stats.map(s => (
          <div key={s.label} className="surface-card px-3 py-2.5">
            <p className={`text-xl font-black tabular-nums leading-none ${s.cls}`}>{loading ? '—' : s.value}</p>
            <p className="text-[10px] text-subtle mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="tab-list">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filter === tab.id
                  ? 'bg-brand-accent/15 text-brand-accent border border-brand-accent/20'
                  : 'text-muted hover:text-main border border-transparent hover:bg-m-hover'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
        >
          <Plus size={14} />
          {tr ? 'Görev Ata' : 'Assign Task'}
        </button>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-brand-accent/50" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-faint">
          <Sparkles size={32} />
          <p className="text-sm">{tr ? 'Görev bulunamadı.' : 'No tasks found.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const st = STATUS_STYLE[task.status] ?? STATUS_STYLE.pending;
            const pr = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.normal;
            const isUpdating = updatingId === task.id;
            const isDeleting = deletingId === task.id;

            return (
              <div
                key={task.id}
                className={`surface-card px-4 py-3.5 flex items-start gap-4 transition-all hover:border-m-border2 ${task.status === 'done' ? 'opacity-60' : ''}`}
              >
                {/* Status dot + room */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                    <span className="text-sm font-bold text-main">
                      {task.room.name}
                      {task.room.floor != null && <span className="text-subtle font-normal text-xs ml-1.5">· Kat {task.room.floor}</span>}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pr.cls}`}>
                      {tr ? pr.label : pr.labelEn}
                    </span>
                    <span className="text-[10px] text-subtle">{tr ? st.label : task.status.replace('_', ' ')}</span>
                  </div>

                  <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1.5 text-[11px] text-muted">
                      <User size={10} />
                      {displayName(task.assignedTo) ?? (tr ? 'Atanmamış' : 'Unassigned')}
                    </span>
                    {task.notes && (
                      <span className="text-[11px] text-subtle italic truncate max-w-[200px]">"{task.notes}"</span>
                    )}
                    <span className="text-[10px] text-subtle tabular-nums ml-auto">
                      {new Date(task.createdAt).toLocaleDateString(tr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isUpdating ? (
                    <Loader2 size={14} className="animate-spin text-subtle" />
                  ) : task.status !== 'done' ? (
                    <>
                      {task.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(task, 'in_progress')}
                          title={tr ? 'Başlat' : 'Start'}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-sky-400/60 hover:text-sky-400 hover:bg-sky-400/8 border border-transparent hover:border-sky-400/15 transition-all"
                        >
                          <Clock size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => updateStatus(task, 'done')}
                        title={tr ? 'Tamamlandı' : 'Mark done'}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-400/8 border border-transparent hover:border-emerald-400/15 transition-all"
                      >
                        <CheckCircle2 size={13} />
                      </button>
                    </>
                  ) : null}

                  {isDeleting ? (
                    <Loader2 size={12} className="animate-spin text-subtle" />
                  ) : (
                    <button
                      onClick={() => deleteTask(task.id)}
                      title={tr ? 'Sil' : 'Delete'}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-subtle hover:text-red-400 hover:bg-red-500/8 border border-transparent hover:border-red-500/15 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateModal
          tr={tr}
          rooms={rooms}
          staff={staff}
          onClose={() => setShowCreate(false)}
          onCreate={task => { setTasks(prev => [task, ...prev]); setShowCreate(false); }}
        />
      )}
    </div>
  );
}
