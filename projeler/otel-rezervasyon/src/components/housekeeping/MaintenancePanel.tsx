'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Plus, Loader2, Check, X } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

interface ReportRoom { id: string; name: string; floor: number | null }
interface Report {
  id: string;
  room: ReportRoom;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
}
interface RoomOption { id: string; name: string; floor: number | null }

interface Props { tr: boolean }

export function MaintenancePanel({ tr }: Props) {
  const toast = useToast();
  const [reports, setReports]   = useState<Report[]>([]);
  const [rooms, setRooms]       = useState<RoomOption[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ roomId: '', description: '', priority: 'normal' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, rmRes] = await Promise.all([
        fetch('/api/maintenance', { credentials: 'include' }),
        fetch('/api/rooms', { credentials: 'include' }),
      ]);
      const [rd, rm] = await Promise.all([rRes.json(), rmRes.json()]);
      if (rd.ok) setReports(rd.reports);
      if (rm.ok) setRooms(rm.rooms);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleSubmit() {
    if (!form.roomId || !form.description.trim()) {
      toast.error(tr ? 'Oda ve açıklama zorunludur.' : 'Room and description are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setReports(prev => [data.report, ...prev]);
      setForm({ roomId: '', description: '', priority: 'normal' });
      setShowForm(false);
      toast.success(tr ? 'Hasar bildirimi gönderildi.' : 'Damage report submitted.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (tr ? 'Hata.' : 'Error.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-brand-accent/50" /></div>;
  }

  return (
    <div className="space-y-4">

      {/* New report button */}
      <div className="flex justify-end">
        <button onClick={() => setShowForm(v => !v)} className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm">
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? (tr ? 'İptal' : 'Cancel') : (tr ? 'Hasar Bildir' : 'Report Damage')}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="surface-panel p-4 space-y-3">
          <select
            value={form.roomId}
            onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
            className="control-base px-3 py-2 text-sm appearance-none"
          >
            <option value="">{tr ? '— Oda seçin —' : '— Select room —'}</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}{r.floor != null ? ` · Kat ${r.floor}` : ''}</option>
            ))}
          </select>

          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder={tr ? 'Hasar veya arıza açıklaması...' : 'Damage or malfunction description...'}
            className="control-base px-3 py-2 text-sm resize-none"
          />

          <div className="flex gap-2">
            {(['normal', 'urgent'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setForm(f => ({ ...f, priority: p }))}
                className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  form.priority === p
                    ? p === 'urgent' ? 'text-red-400 border-red-500/20 bg-red-500/8' : 'text-main border-m-border2 bg-m-surface2'
                    : 'text-subtle border-m-border'
                }`}
              >
                {p === 'urgent' ? (tr ? 'Acil' : 'Urgent') : (tr ? 'Normal' : 'Normal')}
              </button>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary w-full text-sm flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {tr ? 'Gönder' : 'Submit'}
          </button>
        </div>
      )}

      {/* Reports list */}
      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-faint">
          <AlertTriangle size={32} />
          <p className="text-sm">{tr ? 'Hasar bildirimi yok.' : 'No damage reports.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map(r => (
            <div
              key={r.id}
              className={`rounded-2xl border px-4 py-3.5 ${
                r.status === 'resolved' ? 'opacity-60 border-m-border bg-m-surface' :
                r.priority === 'urgent' ? 'border-red-500/20 bg-red-500/[0.04]' :
                'border-m-border bg-m-surface'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.priority === 'urgent' && <AlertTriangle size={11} className="text-red-400 shrink-0" />}
                    <span className="text-sm font-bold text-main">
                      {r.room.name}
                      {r.room.floor != null && <span className="text-xs text-subtle font-normal ml-1.5">· Kat {r.room.floor}</span>}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      r.status === 'resolved' ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/8' : 'text-amber-400 border-amber-400/20 bg-amber-400/6'
                    }`}>
                      {r.status === 'resolved' ? (tr ? 'Çözüldü' : 'Resolved') : (tr ? 'Açık' : 'Open')}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted mt-1.5 leading-relaxed">{r.description}</p>
                  <p className="text-[10px] text-subtle mt-1 tabular-nums">
                    {new Date(r.createdAt).toLocaleDateString(tr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
