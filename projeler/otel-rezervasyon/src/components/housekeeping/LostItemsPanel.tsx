'use client';

import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Loader2, Check, X } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';

interface ItemRoom { id: string; name: string; floor: number | null }
interface LostItem {
  id: string;
  room: ItemRoom;
  description: string;
  status: string;
  foundAt: string;
}
interface RoomOption { id: string; name: string; floor: number | null }

interface Props { tr: boolean }

const STATUS_STYLE: Record<string, { label: string; labelEn: string; cls: string }> = {
  found:     { label: 'Depoda',    labelEn: 'In Storage', cls: 'text-sky-400 border-sky-400/20 bg-sky-400/6'         },
  claimed:   { label: 'Teslim Edildi', labelEn: 'Claimed',   cls: 'text-emerald-400 border-emerald-400/20 bg-emerald-400/8' },
  discarded: { label: 'İmha Edildi',   labelEn: 'Discarded', cls: 'text-muted border-m-border bg-m-surface2'    },
};

export function LostItemsPanel({ tr }: Props) {
  const toast = useToast();
  const [items, setItems]       = useState<LostItem[]>([]);
  const [rooms, setRooms]       = useState<RoomOption[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ roomId: '', description: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, rRes] = await Promise.all([
        fetch('/api/lost-items', { credentials: 'include' }),
        fetch('/api/rooms', { credentials: 'include' }),
      ]);
      const [id_, rd] = await Promise.all([iRes.json(), rRes.json()]);
      if (id_.ok) setItems(id_.items);
      if (rd.ok) setRooms(rd.rooms);
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
      const res = await fetch('/api/lost-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      setItems(prev => [data.item, ...prev]);
      setForm({ roomId: '', description: '' });
      setShowForm(false);
      toast.success(tr ? 'Kayıp eşya kaydedildi.' : 'Lost item recorded.');
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

      <div className="flex justify-end">
        <button onClick={() => setShowForm(v => !v)} className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm">
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? (tr ? 'İptal' : 'Cancel') : (tr ? 'Eşya Kaydet' : 'Log Item')}
        </button>
      </div>

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
            placeholder={tr ? 'Eşyanın tanımı (renk, marka, tür...)' : 'Item description (color, brand, type...)'}
            className="control-base px-3 py-2 text-sm resize-none"
          />

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary w-full text-sm flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {tr ? 'Kaydet' : 'Save'}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-faint">
          <Package size={32} />
          <p className="text-sm">{tr ? 'Kayıp eşya kaydı yok.' : 'No lost items logged.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.found;
            return (
              <div
                key={item.id}
                className={`rounded-2xl border px-4 py-3.5 ${item.status !== 'found' ? 'opacity-60 border-m-border bg-m-surface' : 'border-m-border bg-m-surface'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-main">
                        {item.room.name}
                        {item.room.floor != null && <span className="text-xs text-subtle font-normal ml-1.5">· Kat {item.room.floor}</span>}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.cls}`}>
                        {tr ? st.label : st.labelEn}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted mt-1.5 leading-relaxed">{item.description}</p>
                    <p className="text-[10px] text-subtle mt-1 tabular-nums">
                      {new Date(item.foundAt).toLocaleDateString(tr ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
