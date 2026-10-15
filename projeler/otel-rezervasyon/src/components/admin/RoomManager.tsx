'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Loader2, DoorOpen, BedDouble, X, ImagePlus, Film, Pencil, AlertTriangle, Check, Sparkles, Wrench, RotateCcw, CalendarCheck } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastProvider';

// ── Types ────────────────────────────────────────────────────────────────────

interface MediaItem {
  id: string;
  originalName: string;
  mimeType: string;
  pathOriginal: string;
  pathThumb: string | null;
  pathMedium: string | null;
  isProcessed: boolean;
}

interface PendingItem {
  file: File;
  objectUrl: string;
}

interface RoomType {
  id: string;
  name: string;
}

interface Room {
  id: string;
  name: string;
  floor: number | null;
  status: string;
  basePrice: number;
  description: string | null;
  isActive: boolean;
  roomTypeId: string;
  maxAdults: number;
  maxChildren: number;
  roomType: { id: string; name: string };
  media: MediaItem[];
}

type RoomManagerMode = 'admin' | 'frontdesk';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_TAG: Record<string, string> = {
  available:   'tag tag-success',
  occupied:    'tag tag-info',
  dirty:       'tag tag-warning',
  cleaning:    'tag tag-info',
  maintenance: 'tag tag-danger',
};

const STATUS_LABEL: Record<string, { tr: string; en: string }> = {
  available:   { tr: 'Müsait',       en: 'Available'   },
  occupied:    { tr: 'Dolu',         en: 'Occupied'     },
  dirty:       { tr: 'Temizlenecek', en: 'Needs Cleaning' },
  cleaning:    { tr: 'Temizleniyor', en: 'Cleaning'     },
  maintenance: { tr: 'Bakım',        en: 'Maintenance'  },
};

const STATUS_STYLE: Record<string, { dot: string; text: string; border: string; glow: string }> = {
  available:   { dot: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-500/35', glow: 'rgba(52,211,153,0.15)'  },
  occupied:    { dot: 'bg-sky-400',     text: 'text-sky-400',     border: 'border-sky-500/35',     glow: 'rgba(56,189,248,0.15)'  },
  dirty:       { dot: 'bg-amber-400',   text: 'text-amber-400',   border: 'border-amber-500/35',   glow: 'rgba(251,191,36,0.15)'  },
  cleaning:    { dot: 'bg-sky-400',     text: 'text-sky-400',     border: 'border-sky-500/35',     glow: 'rgba(56,189,248,0.15)'  },
  maintenance: { dot: 'bg-red-400',     text: 'text-red-400',     border: 'border-red-500/35',     glow: 'rgba(248,113,113,0.15)' },
};

// ── Static status badge (read-only) ──────────────────────────────────────────

function StatusBadge({ status, tr }: { status: string; tr: boolean }) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.available;
  return (
    <div
      className={`flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${style.text} ${style.border}`}
      style={{ background: `linear-gradient(135deg, ${style.glow} 0%, var(--m-surface) 100%)`, backdropFilter: 'blur(8px)' }}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      {tr ? STATUS_LABEL[status]?.tr : STATUS_LABEL[status]?.en}
    </div>
  );
}

function dateInputValue(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function nightsBetween(checkInDate: string, checkOutDate: string) {
  const checkIn = new Date(`${checkInDate}T00:00:00`);
  const checkOut = new Date(`${checkOutDate}T00:00:00`);

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkOut <= checkIn) {
    return 0;
  }

  return Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
}

function QuickReservationModal({
  room,
  tr,
  onClose,
  onReserved,
}: {
  room: Room;
  tr: boolean;
  onClose: () => void;
  onReserved: (status: string, confirmationId: string) => void;
}) {
  const toast = useToast();
  const today = dateInputValue();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationality: 'TR',
    tcKimlikNo: '',
    adultsCount: '1',
    childrenCount: '0',
    checkInDate: today,
    checkOutDate: dateInputValue(1),
    checkInNow: true,
    specialRequests: '',
  });

  const nights = nightsBetween(form.checkInDate, form.checkOutDate);
  const totalPrice = nights * room.basePrice;
  const checkInIsToday = form.checkInDate === today;
  const needsCurrentAvailability = checkInIsToday;
  const canSubmit = room.isActive && nights > 0
    && (!needsCurrentAvailability || room.status === 'available')
    && form.firstName.trim() && form.lastName.trim() && form.email.trim() && form.phone.trim();

  useEffect(() => {
    if (!checkInIsToday && form.checkInNow) {
      setForm(prev => ({ ...prev, checkInNow: false }));
    }
  }, [checkInIsToday, form.checkInNow]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    setSaving(true);
    try {
      const res = await fetch('/api/reservations/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          adultsCount: Number(form.adultsCount),
          childrenCount: Number(form.childrenCount),
          checkInNow: checkInIsToday && form.checkInNow,
          tcKimlikNo: form.tcKimlikNo || undefined,
          specialRequests: form.specialRequests || undefined,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message ?? (tr ? 'Rezervasyon oluşturulamadı.' : 'Reservation could not be created.'));
      }

      toast.success(
        tr ? 'Hızlı rezervasyon oluşturuldu.' : 'Quick reservation created.',
        `${tr ? 'Onay kodu' : 'Confirmation'}: ${data.confirmationId}`,
      );
      onReserved(data.roomStatus ?? room.status, data.confirmationId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (tr ? 'Rezervasyon oluşturulamadı.' : 'Reservation could not be created.'));
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'control-base px-3 py-2 text-sm';

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={tr ? 'Hızlı Rezervasyon' : 'Quick Reservation'}
      description={`${room.name} · ${room.roomType.name}`}
      size="lg"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-brand-accent/15 bg-brand-accent/7 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-main">{room.name}</p>
              <p className="text-[11px] text-subtle mt-0.5">
                {room.roomType.name}
                {room.floor != null ? ` · ${room.floor}. ${tr ? 'Kat' : 'Floor'}` : ''}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-black text-brand-accent leading-none">
                ₺{totalPrice.toLocaleString('tr-TR')}
              </p>
              <p className="text-[10px] text-subtle mt-1">
                {nights || 0} {tr ? 'gece' : 'night'}
              </p>
            </div>
          </div>
        </div>

        {needsCurrentAvailability && room.status !== 'available' && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {tr
              ? 'Bugün giriş için oda şu anda müsait olmalı. İleri tarih seçerseniz uygunluk takvime göre kontrol edilir.'
              : 'Same-day check-in requires the room to be available now. Future dates are checked by calendar availability.'}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className={inputClass} placeholder={tr ? 'Ad' : 'First name'} value={form.firstName} onChange={e => update('firstName', e.target.value)} />
          <input className={inputClass} placeholder={tr ? 'Soyad' : 'Last name'} value={form.lastName} onChange={e => update('lastName', e.target.value)} />
          <input className={inputClass} type="email" placeholder="E-posta" value={form.email} onChange={e => update('email', e.target.value)} />
          <input className={inputClass} placeholder={tr ? 'Telefon' : 'Phone'} value={form.phone} onChange={e => update('phone', e.target.value)} />
          <input className={inputClass} placeholder={tr ? 'Uyruk' : 'Nationality'} value={form.nationality} onChange={e => update('nationality', e.target.value)} />
          <input className={inputClass} placeholder={tr ? 'T.C. kimlik no (opsiyonel)' : 'National ID (optional)'} value={form.tcKimlikNo} onChange={e => update('tcKimlikNo', e.target.value)} />
          <div>
            <label className="label-sm">{tr ? 'Giriş' : 'Check-in'}</label>
            <input className={inputClass} type="date" value={form.checkInDate} onChange={e => update('checkInDate', e.target.value)} />
          </div>
          <div>
            <label className="label-sm">{tr ? 'Çıkış' : 'Check-out'}</label>
            <input className={inputClass} type="date" value={form.checkOutDate} onChange={e => update('checkOutDate', e.target.value)} />
          </div>
          <div>
            <label className="label-sm">{tr ? 'Yetişkin' : 'Adults'}</label>
            <input className={inputClass} type="number" min={1} max={room.maxAdults} value={form.adultsCount} onChange={e => update('adultsCount', e.target.value)} />
          </div>
          <div>
            <label className="label-sm">{tr ? 'Çocuk' : 'Children'}</label>
            <input className={inputClass} type="number" min={0} max={room.maxChildren} value={form.childrenCount} onChange={e => update('childrenCount', e.target.value)} />
          </div>
        </div>

        <textarea
          className={`${inputClass} h-20 resize-none`}
          placeholder={tr ? 'Not / özel istek (opsiyonel)' : 'Note / special request (optional)'}
          value={form.specialRequests}
          onChange={e => update('specialRequests', e.target.value)}
        />

        <label className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${checkInIsToday ? 'border-m-border bg-m-surface' : 'border-m-border bg-m-surface opacity-60'}`}>
          <input
            type="checkbox"
            checked={form.checkInNow && checkInIsToday}
            disabled={!checkInIsToday}
            onChange={e => update('checkInNow', e.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="block text-sm font-semibold text-main">
              {tr ? 'Misafir şimdi giriş yapacak' : 'Guest will check in now'}
            </span>
            <span className="block text-[11px] text-subtle mt-0.5 leading-relaxed">
              {tr
                ? 'Seçiliyse rezervasyon onaylanır, check-in tamamlanır ve oda doğrudan dolu görünür.'
                : 'When enabled, the reservation is confirmed, checked in, and the room becomes occupied.'}
            </span>
          </span>
        </label>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">
            {tr ? 'Vazgeç' : 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            className="btn-primary flex-1 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CalendarCheck size={14} />}
            {tr ? 'Rezervasyonu Oluştur' : 'Create Reservation'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Send to Cleaning modal ────────────────────────────────────────────────────

function SendToCleaningModal({
  room, tr, onClose, onSent,
}: {
  room: { id: string; name: string };
  tr: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const toast = useToast();
  const [staff, setStaff] = useState<{ id: string; firstName: string | null; lastName: string | null; email: string }[]>([]);
  const [assignedToId, setAssignedToId] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/users', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.ok) setStaff(d.users.filter((u: { role: { slug: string } }) => u.role.slug === 'temizlikci')); });
  }, []);

  async function handleSubmit() {
    setSaving(true);
    try {
      const res = await fetch('/api/cleaning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, assignedToId: assignedToId || null, priority, notes: notes || null }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);
      toast.success(tr ? 'Temizliğe gönderildi.' : 'Sent to cleaning.');
      onSent();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : (tr ? 'Hata.' : 'Error.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
      <div className="w-full max-w-sm modal-shell" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-m-border rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <Sparkles size={14} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-main">{tr ? 'Temizliğe Gönder' : 'Send to Cleaning'}</p>
              <p className="text-[11px] text-subtle">{room.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-subtle hover:text-main hover:bg-m-hover transition-colors"><X size={14} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'Atanan Kişi (opsiyonel)' : 'Assign To (optional)'}</label>
            <select value={assignedToId} onChange={e => setAssignedToId(e.target.value)} className="control-base px-3 py-2 text-sm appearance-none">
              <option value="">{tr ? '— Atanmamış —' : '— Unassigned —'}</option>
              {staff.map(s => {
                const name = [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email;
                return <option key={s.id} value={s.id}>{name}</option>;
              })}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'Öncelik' : 'Priority'}</label>
            <div className="flex gap-2">
              {(['normal', 'urgent'] as const).map(p => (
                <button key={p} type="button" onClick={() => setPriority(p)} className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all ${priority === p ? (p === 'urgent' ? 'text-red-400 border-red-500/20 bg-red-500/8' : 'text-main border-m-border2 bg-m-surface2') : 'text-subtle border-m-border'}`}>
                  {p === 'urgent' ? (tr ? 'Acil' : 'Urgent') : (tr ? 'Normal' : 'Normal')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-subtle uppercase tracking-widest mb-1.5">{tr ? 'Not (opsiyonel)' : 'Note (optional)'}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder={tr ? 'Özel talimatlar...' : 'Special instructions...'} className="control-base px-3 py-2 text-sm resize-none" />
          </div>
        </div>

        <div className="flex gap-2.5 px-5 pb-5">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">{tr ? 'İptal' : 'Cancel'}</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1 text-sm flex items-center justify-center gap-2">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {tr ? 'Gönder' : 'Send'}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function RoomManager({ viewMode = 'list', mode = 'admin' }: { viewMode?: 'card' | 'list'; mode?: RoomManagerMode }) {
  const { language } = useLanguage();
  const tr = language === 'tr';
  const toast = useToast();
  const canManageRooms = mode === 'admin';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Create form state ─────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [floor, setFloor] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [description, setDescription] = useState('');
  const [maxAdults, setMaxAdults] = useState('2');
  const [maxChildren, setMaxChildren] = useState('0');
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoomTypeId, setEditRoomTypeId] = useState('');
  const [editFloor, setEditFloor] = useState('');
  const [editBasePrice, setEditBasePrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMaxAdults, setEditMaxAdults] = useState('2');
  const [editMaxChildren, setEditMaxChildren] = useState('0');
  const [editPendingItems, setEditPendingItems] = useState<PendingItem[]>([]);
  const [saving, setSaving] = useState(false);

  // ── Delete confirm ────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Cleaning / maintenance ────────────────────────────────────────────────
  const [cleaningTarget, setCleaningTarget] = useState<Room | null>(null);
  const [maintenanceLoadingId, setMaintenanceLoadingId] = useState<string | null>(null);
  const [quickReservationRoom, setQuickReservationRoom] = useState<Room | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const [roomsRes, typesRes] = await Promise.all([
        fetch('/api/rooms'),
        fetch('/api/room-types'),
      ]);
      const [roomsData, typesData] = await Promise.all([
        roomsRes.json(),
        typesRes.json(),
      ]);
      if (roomsData.ok) setRooms(roomsData.rooms);
      if (typesData.ok) setRoomTypes(typesData.roomTypes);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Create handlers ────────────────────────────────────────────────────────

  const resetForm = () => {
    setShowForm(false);
    setName('');
    setRoomTypeId('');
    setFloor('');
    setBasePrice('');
    setDescription('');
    setMaxAdults('2');
    setMaxChildren('0');
    setPendingItems(prev => {
      prev.forEach(item => { if (item.objectUrl) URL.revokeObjectURL(item.objectUrl); });
      return [];
    });
  };

  const handleFormFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newItems: PendingItem[] = Array.from(files).map(file => ({
      file,
      objectUrl: URL.createObjectURL(file),
    }));
    setPendingItems(prev => [...prev, ...newItems]);
    e.target.value = '';
  };

  const removePendingItem = (index: number) => {
    setPendingItems(prev => {
      const item = prev[index];
      if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleCreate = async () => {
    if (!name.trim() || !roomTypeId || !basePrice) return;
    setCreating(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          roomTypeId,
          floor: floor ? parseInt(floor, 10) : undefined,
          basePrice: parseInt(basePrice, 10),
          description: description.trim() || undefined,
          status: 'available',
          maxAdults: parseInt(maxAdults, 10) || 2,
          maxChildren: parseInt(maxChildren, 10) || 0,
        }),
      });
      const data = await res.json();
      if (!data.ok) return;

      const newRoom: Room = { ...data.room, media: [] };

      if (pendingItems.length > 0) {
        const uploadedMedia: MediaItem[] = [];
        for (const item of pendingItems) {
          const fd = new FormData();
          fd.append('file', item.file);
          fd.append('entityType', 'room');
          fd.append('entityId', newRoom.id);
          try {
            const r = await fetch('/api/media/upload', { method: 'POST', body: fd });
            const d = await r.json();
            if (d.ok) uploadedMedia.push(d.media);
          } catch { /* silent */ }
        }
        newRoom.media = uploadedMedia;
      }

      setRooms(prev => [...prev, newRoom]);
      resetForm();
      toast.success(tr ? 'Oda eklendi' : 'Room added', newRoom.name);
    } catch (err) {
      console.error('Failed to create room:', err);
      toast.error(tr ? 'Oluşturma başarısız' : 'Creation failed');
    } finally {
      setCreating(false);
    }
  };

  // ── Edit handlers ──────────────────────────────────────────────────────────

  const openEdit = (room: Room) => {
    setEditingRoom(room);
    setEditName(room.name);
    setEditRoomTypeId(room.roomTypeId);
    setEditFloor(room.floor != null ? String(room.floor) : '');
    setEditBasePrice(String(room.basePrice));
    setEditDescription(room.description ?? '');
    setEditMaxAdults(String(room.maxAdults));
    setEditMaxChildren(String(room.maxChildren));
    setEditPendingItems([]);
  };

  const closeEdit = () => {
    setEditPendingItems(prev => {
      prev.forEach(item => { if (item.objectUrl) URL.revokeObjectURL(item.objectUrl); });
      return [];
    });
    setEditingRoom(null);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newItems: PendingItem[] = Array.from(files).map(file => ({
      file,
      objectUrl: URL.createObjectURL(file),
    }));
    setEditPendingItems(prev => [...prev, ...newItems]);
    e.target.value = '';
  };

  const removeEditPendingItem = (index: number) => {
    setEditPendingItems(prev => {
      const item = prev[index];
      if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSaveEdit = async () => {
    if (!editingRoom || !editName.trim() || !editRoomTypeId || !editBasePrice) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/rooms/${editingRoom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          roomTypeId: editRoomTypeId,
          floor: editFloor ? parseInt(editFloor, 10) : null,
          basePrice: parseInt(editBasePrice, 10),
          description: editDescription.trim() || null,
          maxAdults: parseInt(editMaxAdults, 10) || 2,
          maxChildren: parseInt(editMaxChildren, 10) || 0,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        let updatedMedia = editingRoom.media;
        if (editPendingItems.length > 0) {
          const uploadedMedia: MediaItem[] = [];
          for (const item of editPendingItems) {
            const fd = new FormData();
            fd.append('file', item.file);
            fd.append('entityType', 'room');
            fd.append('entityId', editingRoom.id);
            try {
              const r = await fetch('/api/media/upload', { method: 'POST', body: fd });
              const d = await r.json();
              if (d.ok) uploadedMedia.push(d.media);
            } catch { /* silent */ }
          }
          updatedMedia = [...updatedMedia, ...uploadedMedia];
        }
        setRooms(prev =>
          prev.map(r => r.id === editingRoom.id ? { ...r, ...data.room, media: updatedMedia } : r)
        );
        closeEdit();
        toast.success(tr ? 'Değişiklikler kaydedildi' : 'Changes saved');
      } else {
        toast.error(tr ? 'Kaydetme başarısız' : 'Save failed');
      }
    } catch (err) {
      console.error('Failed to update room:', err);
      toast.error(tr ? 'Kaydetme başarısız' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete handlers ────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/rooms/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setRooms(prev => prev.filter(r => r.id !== deleteTarget.id));
        toast.success(tr ? 'Oda silindi' : 'Room deleted', deleteTarget.name);
        setDeleteTarget(null);
      } else {
        toast.error(tr ? 'Silme başarısız' : 'Delete failed');
      }
    } catch (err) {
      console.error('Failed to delete room:', err);
      toast.error(tr ? 'Silme başarısız' : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleMaintenance = async (room: Room) => {
    const newStatus = room.status === 'maintenance' ? 'available' : 'maintenance';
    setMaintenanceLoadingId(room.id);
    try {
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) setRooms(prev => prev.map(r => r.id === room.id ? { ...r, status: newStatus } : r));
    } catch { /* silent */ }
    finally { setMaintenanceLoadingId(null); }
  };

  // ── Media handlers ─────────────────────────────────────────────────────────

  const handleDeleteMedia = async (mediaId: string, roomId: string) => {
    try {
      const res = await fetch(`/api/media/${mediaId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setRooms(prev =>
          prev.map(r => r.id === roomId ? { ...r, media: r.media.filter(m => m.id !== mediaId) } : r)
        );
        if (editingRoom?.id === roomId) {
          setEditingRoom(prev => prev ? { ...prev, media: prev.media.filter(m => m.id !== mediaId) } : null);
        }
      }
    } catch { /* silent */ }
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-brand-accent/50" size={28} />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted">
            {tr
              ? `${rooms.length} oda kayıtlı`
              : `${rooms.length} room${rooms.length !== 1 ? 's' : ''} registered`}
          </p>
          <p className="section-title mt-0.5">
            {mode === 'frontdesk'
              ? (tr ? 'Oda durumlarını izleyin ve müsait odadan hızlı rezervasyon alın' : 'Track room status and create quick reservations from available rooms')
              : (tr ? 'Oda durumlarını ve bilgilerini yönetin' : 'Manage room statuses and details')}
          </p>
        </div>
        {canManageRooms && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-card text-sm"
          >
            <Plus size={15} />
            {tr ? 'Yeni Oda Ekle' : 'Add New Room'}
          </button>
        )}
      </div>

      {/* ── Create Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={tr ? 'Yeni Oda Ekle' : 'Add New Room'}
        description={tr ? 'Odanın bilgilerini girin ve bir oda çeşidine atayın' : 'Enter room details and assign to a room type'}
      >
        <RoomFormFields
          tr={tr}
          name={name} setName={setName}
          roomTypeId={roomTypeId} setRoomTypeId={setRoomTypeId}
          floor={floor} setFloor={setFloor}
          basePrice={basePrice} setBasePrice={setBasePrice}
          description={description} setDescription={setDescription}
          maxAdults={maxAdults} setMaxAdults={setMaxAdults}
          maxChildren={maxChildren} setMaxChildren={setMaxChildren}
          roomTypes={roomTypes}
          pendingItems={pendingItems}
          onFileChange={handleFormFileChange}
          onRemovePendingItem={removePendingItem}
          onSubmit={handleCreate}
          onCancel={resetForm}
          submitting={creating}
          isNew
        />
      </Modal>

      {/* ── Edit Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={!!editingRoom}
        onClose={closeEdit}
        title={tr ? 'Odayı Düzenle' : 'Edit Room'}
        description={editingRoom?.name}
      >
        {editingRoom && (
          <RoomFormFields
            tr={tr}
            name={editName} setName={setEditName}
            roomTypeId={editRoomTypeId} setRoomTypeId={setEditRoomTypeId}
            floor={editFloor} setFloor={setEditFloor}
            basePrice={editBasePrice} setBasePrice={setEditBasePrice}
            description={editDescription} setDescription={setEditDescription}
            maxAdults={editMaxAdults} setMaxAdults={setEditMaxAdults}
            maxChildren={editMaxChildren} setMaxChildren={setEditMaxChildren}
            roomTypes={roomTypes}
            pendingItems={editPendingItems}
            onFileChange={handleEditFileChange}
            onRemovePendingItem={removeEditPendingItem}
            existingMedia={editingRoom.media}
            onDeleteExistingMedia={(mediaId) => handleDeleteMedia(mediaId, editingRoom.id)}
            onSubmit={handleSaveEdit}
            onCancel={closeEdit}
            submitting={saving}
            isNew={false}
          />
        )}
      </Modal>

      {/* ── Delete confirmation modal ─────────────────────────── */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={tr ? 'Odayı Sil' : 'Delete Room'}
        size="sm"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-300">
                  {tr ? `"${deleteTarget.name}" odası silinecek.` : `Room "${deleteTarget.name}" will be deleted.`}
                </p>
                <p className="text-[11px] text-red-400/70 mt-1 leading-relaxed">
                  {tr ? 'Bu oda ve varsa medya dosyaları kalıcı olarak silinir.' : 'This room and any associated media will be permanently deleted.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleDelete}
                disabled={!!deletingId}
                className="flex items-center gap-2 px-5 py-2.5 rounded-card text-sm font-semibold bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {deletingId && <Loader2 size={14} className="animate-spin" />}
                {tr ? 'Evet, sil' : 'Yes, delete'}
              </button>
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary px-5 py-2.5 rounded-card text-sm">
                {tr ? 'İptal' : 'Cancel'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Cleaning modal ───────────────────────────────────── */}
      {cleaningTarget && (
        <SendToCleaningModal
          room={cleaningTarget}
          tr={tr}
          onClose={() => setCleaningTarget(null)}
          onSent={() => {
            setRooms(prev => prev.map(r => r.id === cleaningTarget.id ? { ...r, status: 'dirty' } : r));
            setCleaningTarget(null);
          }}
        />
      )}

      {quickReservationRoom && (
        <QuickReservationModal
          room={quickReservationRoom}
          tr={tr}
          onClose={() => setQuickReservationRoom(null)}
          onReserved={(status) => {
            setRooms(prev => prev.map(r => r.id === quickReservationRoom.id ? { ...r, status } : r));
            setQuickReservationRoom(null);
          }}
        />
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {rooms.length === 0 && (
        <div className="panel-glass-dashed">
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl surface-soft flex items-center justify-center">
              <DoorOpen size={28} className="text-faint" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-muted">
                {tr ? 'Henüz oda eklenmedi' : 'No rooms added yet'}
              </p>
              <p className="text-xs text-subtle max-w-xs leading-relaxed">
                {tr ? 'İlk odanızı eklemek için yukarıdaki butona tıklayın.' : 'Click the button above to add your first room.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Room list / card view ─────────────────────────────── */}
      {rooms.length > 0 && (viewMode === 'card' ? (

        /* ══ CARD GRID ══ */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {rooms.map(room => {
            const cover = room.media[0];
            const coverSrc = cover
              ? (cover.pathThumb ? `/uploads/${cover.pathThumb}` : `/uploads/${cover.pathOriginal}`)
              : null;
            const coverIsVideo = cover?.mimeType.startsWith('video/') ?? false;

            return (
              <div
                key={room.id}
                className="surface-card-raised overflow-hidden group hover:border-brand-accent/25 transition-all duration-200 flex flex-col"
              >
                {/* Cover */}
                <div className="relative shrink-0" style={{ aspectRatio: '9/4' }}>
                  {coverSrc ? (
                    coverIsVideo ? (
                      <video src={`/uploads/${cover!.pathOriginal}`} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverSrc} alt={room.name} className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full media-placeholder flex flex-col items-center justify-center gap-2">
                      <BedDouble size={24} className="text-brand-accent/25" />
                      <span className="font-mono font-black text-lg text-faint tracking-widest">{room.name}</span>
                    </div>
                  )}

                  {/* Status badge — top left (read-only) */}
                  <div className="absolute top-2 left-2">
                    <StatusBadge status={room.status} tr={tr} />
                  </div>

                  {/* Edit / Delete — top right, hover */}
                  {canManageRooms && (
                    <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(room)}
                        className="w-7 h-7 rounded-lg overlay-control flex items-center justify-center transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                      {deletingId === room.id ? (
                        <div className="w-7 h-7 rounded-lg overlay-control flex items-center justify-center">
                          <Loader2 size={12} className="animate-spin text-subtle" />
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteTarget(room)}
                          className="w-7 h-7 rounded-lg overlay-control flex items-center justify-center hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Media count badge — bottom right */}
                  {room.media.length > 0 && (
                    <div
                      className="absolute bottom-2 right-2 overlay-control flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
                    >
                      <ImagePlus size={9} />
                      {room.media.length}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 p-2.5 border-t border-m-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-main text-sm leading-none truncate">{room.name}</h3>
                      <p className="text-[11px] text-subtle mt-1 truncate">
                        {room.roomType.name}
                        {room.floor != null ? ` · Kat ${room.floor}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-brand-accent leading-none">
                        ₺{room.basePrice.toLocaleString('tr-TR')}
                      </p>
                      <p className="text-[9px] text-subtle mt-0.5">/{tr ? 'gece' : 'night'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="tag tag-muted">
                      {room.maxAdults}{tr ? 'y' : 'a'}
                      {room.maxChildren > 0 ? ` + ${room.maxChildren}${tr ? 'ç' : 'c'}` : ''}
                    </span>
                    {!room.isActive && (
                      <span className="tag tag-danger">{tr ? 'Pasif' : 'Inactive'}</span>
                    )}
                  </div>

                  {/* Action buttons */}
                  {room.isActive && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-m-border">
                      <button
                        onClick={() => setQuickReservationRoom(room)}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold text-black bg-brand-accent hover:brightness-105 transition-colors"
                      >
                        <CalendarCheck size={10} />
                        {tr ? 'Rezervasyon' : 'Reserve'}
                      </button>
                      {room.status === 'available' && (
                        <button
                          onClick={() => setCleaningTarget(room)}
                          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold text-amber-400 border border-amber-400/20 bg-amber-400/6 hover:bg-amber-400/12 transition-colors"
                        >
                          <Sparkles size={10} />
                          {tr ? 'Temizlik' : 'Clean'}
                        </button>
                      )}
                      {canManageRooms && (room.status === 'available' || room.status === 'maintenance') && (
                        maintenanceLoadingId === room.id ? (
                          <div className="flex items-center px-2"><Loader2 size={11} className="animate-spin text-subtle" /></div>
                        ) : (
                          <button
                            onClick={() => handleToggleMaintenance(room)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors ${
                              room.status === 'maintenance'
                                ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/6 hover:bg-emerald-400/12'
                                : 'text-muted border-m-border bg-m-surface hover:bg-m-hover hover:text-main'
                            }`}
                          >
                            {room.status === 'maintenance' ? <RotateCcw size={10} /> : <Wrench size={10} />}
                            {room.status === 'maintenance' ? (tr ? 'Aktife Al' : 'Reactivate') : (tr ? 'Askıya Al' : 'Suspend')}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      ) : (

        /* ══ LIST VIEW (mevcut) ══ */
        <div className="space-y-4">
          {rooms.map(room => (
            <div key={room.id} className="panel-glass-raised">

              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--app-accent) 6%, transparent) 0%, transparent 60%)' }}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center shrink-0">
                    <BedDouble size={18} className="text-brand-accent" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-main truncate">{room.name}</h3>
                    <p className="text-[11px] text-subtle mt-0.5">
                      {room.roomType.name}
                      {room.floor != null && ` · ${room.floor}. ${tr ? 'Kat' : 'Floor'}`}
                      {' · '}₺{room.basePrice.toLocaleString('tr-TR')}/{tr ? 'gece' : 'night'}
                      {' · '}{room.maxAdults} {tr ? 'yetişkin' : 'adult'}{room.maxChildren > 0 ? ` + ${room.maxChildren} ${tr ? 'çocuk' : 'child'}` : ''}
                      {' · '}{room.media.length} {tr ? 'medya' : 'media'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
                  <StatusBadge status={room.status} tr={tr} />

                  {room.isActive && (
                    <button
                      onClick={() => setQuickReservationRoom(room)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-black bg-brand-accent hover:brightness-105 transition-colors"
                    >
                      <CalendarCheck size={11} />
                      {tr ? 'Rezervasyon Yap' : 'Reserve'}
                    </button>
                  )}

                  {room.status === 'available' && (
                    <button
                      onClick={() => setCleaningTarget(room)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-amber-400 border border-amber-400/20 bg-amber-400/6 hover:bg-amber-400/12 transition-colors"
                    >
                      <Sparkles size={11} />
                      {tr ? 'Temizliğe Gönder' : 'Send to Cleaning'}
                    </button>
                  )}

                  {canManageRooms && (room.status === 'available' || room.status === 'maintenance') && (
                    maintenanceLoadingId === room.id ? (
                      <Loader2 size={13} className="animate-spin text-subtle" />
                    ) : (
                      <button
                        onClick={() => handleToggleMaintenance(room)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                          room.status === 'maintenance'
                            ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/6 hover:bg-emerald-400/12'
                            : 'text-muted border-m-border bg-m-surface hover:bg-m-hover hover:text-main'
                        }`}
                      >
                        {room.status === 'maintenance' ? <RotateCcw size={11} /> : <Wrench size={11} />}
                        {room.status === 'maintenance' ? (tr ? 'Aktife Al' : 'Reactivate') : (tr ? 'Askıya Al' : 'Suspend')}
                      </button>
                    )
                  )}

                  {canManageRooms && (
                    <>
                      <button onClick={() => openEdit(room)} className="btn-secondary px-3 py-1.5 rounded-lg text-xs gap-1.5">
                        <Pencil size={13} />
                        {tr ? 'Düzenle' : 'Edit'}
                      </button>

                      {deletingId === room.id ? (
                        <Loader2 size={14} className="animate-spin text-subtle" />
                      ) : (
                        <button
                          onClick={() => setDeleteTarget(room)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-subtle hover:text-red-400 hover:bg-red-400/10 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {room.description && (
                <div className="px-5 py-3 border-t border-m-border">
                  <p className="text-[12px] text-muted leading-relaxed">{room.description}</p>
                </div>
              )}

              {room.media.length > 0 && (
                <div className="px-5 pb-5 pt-3 border-t border-m-border">
                  <p className="section-title mb-3">{tr ? 'Medya' : 'Media'}</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {room.media.map(m => {
                      const isVideo = m.mimeType.startsWith('video/');
                      const src = m.pathThumb ? `/uploads/${m.pathThumb}` : `/uploads/${m.pathOriginal}`;
                      return (
                        <div key={m.id} className="relative group rounded-xl overflow-hidden border border-m-border aspect-square media-placeholder">
                          {isVideo ? (
                            <video src={`/uploads/${m.pathOriginal}`} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={src} alt={m.originalName} className="w-full h-full object-cover" />
                          )}
                          <button
                            onClick={() => handleDeleteMedia(m.id, room.id)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full overlay-control flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                          >
                            <Trash2 size={11} className="text-current" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>

      ))}

    </div>
  );
}

// ── Shared form fields component ──────────────────────────────────────────────

function RoomFormFields({
  tr, name, setName, roomTypeId, setRoomTypeId, floor, setFloor,
  basePrice, setBasePrice, description, setDescription,
  maxAdults, setMaxAdults, maxChildren, setMaxChildren,
  roomTypes, pendingItems, onFileChange, onRemovePendingItem,
  existingMedia, onDeleteExistingMedia,
  onSubmit, onCancel, submitting, isNew,
}: {
  tr: boolean;
  name: string; setName: (v: string) => void;
  roomTypeId: string; setRoomTypeId: (v: string) => void;
  floor: string; setFloor: (v: string) => void;
  basePrice: string; setBasePrice: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  maxAdults: string; setMaxAdults: (v: string) => void;
  maxChildren: string; setMaxChildren: (v: string) => void;
  roomTypes: RoomType[];
  pendingItems: PendingItem[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePendingItem: (i: number) => void;
  existingMedia?: MediaItem[];
  onDeleteExistingMedia?: (mediaId: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  isNew: boolean;
}) {
  const hasMedia = (existingMedia?.length ?? 0) > 0 || pendingItems.length > 0;

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="label-sm">{tr ? 'Oda Adı / No' : 'Room Name / No'}</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={tr ? 'Örn: 101, Sultan Suite...' : 'e.g. 101, Sultan Suite...'} className="input-base" autoFocus />
        </div>
        <div className="space-y-2">
          <label className="label-sm">{tr ? 'Kat (opsiyonel)' : 'Floor (optional)'}</label>
          <input type="number" value={floor} onChange={e => setFloor(e.target.value)} placeholder={tr ? 'Örn: 1, 2, 3...' : 'e.g. 1, 2, 3...'} className="input-base" min={0} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="label-sm">{tr ? 'Oda Çeşidi' : 'Room Type'}</label>
        {roomTypes.length === 0 ? (
          <div className="input-base text-subtle text-sm">{tr ? 'Önce bir oda çeşidi oluşturun.' : 'Create a room type first.'}</div>
        ) : (
          <select value={roomTypeId} onChange={e => setRoomTypeId(e.target.value)} className="input-base">
            <option value="" disabled style={{ background: 'var(--m-modal)' }}>{tr ? '— Bir çeşit seçin —' : '— Select a type —'}</option>
            {roomTypes.map(rt => (
              <option key={rt.id} value={rt.id} style={{ background: 'var(--m-modal)' }}>{rt.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-2">
        <label className="label-sm">{tr ? 'Gecelik Fiyat (₺)' : 'Base Price (₺)'}</label>
        <input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)} placeholder="0" className="input-base" min={0} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="label-sm">{tr ? 'Maks. Yetişkin' : 'Max Adults'}</label>
          <input type="number" value={maxAdults} onChange={e => setMaxAdults(e.target.value)} className="input-base" min={1} max={10} placeholder="2" />
        </div>
        <div className="space-y-2">
          <label className="label-sm">{tr ? 'Maks. Çocuk (0 = kabul edilmez)' : 'Max Children (0 = not allowed)'}</label>
          <input type="number" value={maxChildren} onChange={e => setMaxChildren(e.target.value)} className="input-base" min={0} max={10} placeholder="0" />
        </div>
      </div>

      <div className="space-y-2">
        <label className="label-sm">{tr ? 'Açıklama (opsiyonel)' : 'Description (optional)'}</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={tr ? 'Odaya özel notlar...' : 'Room-specific notes...'} className="input-base resize-none h-20" />
      </div>

      {/* ── Media section ─────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="label-sm">{tr ? 'Medya' : 'Media'}</label>

        {hasMedia && (
          <div className="surface-card flex flex-wrap gap-2 p-3">
            {existingMedia?.map(m => {
              const isVideo = m.mimeType.startsWith('video/');
              const src = m.pathThumb ? `/uploads/${m.pathThumb}` : `/uploads/${m.pathOriginal}`;
              return (
                <div key={m.id} className="relative w-16 h-16 rounded-xl overflow-hidden border border-m-border media-placeholder shrink-0 group">
                  {isVideo ? (
                    <video src={`/uploads/${m.pathOriginal}`} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={m.originalName} className="w-full h-full object-cover" />
                  )}
                  {onDeleteExistingMedia && (
                    <button
                      type="button"
                      onClick={() => onDeleteExistingMedia(m.id)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full overlay-control flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                    >
                      <X size={8} className="text-current" />
                    </button>
                  )}
                </div>
              );
            })}

            {pendingItems.map((item, i) => {
              const isVideo = item.file.type.startsWith('video/');
              return (
                <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-m-border media-placeholder shrink-0 ring-1 ring-brand-accent/30">
                  {isVideo ? (
                    <video src={item.objectUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.objectUrl} alt={item.file.name} className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => onRemovePendingItem(i)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full overlay-control flex items-center justify-center hover:text-red-400 transition-colors"
                  >
                    <X size={8} className="text-current" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <label className="btn-secondary w-full py-3 rounded-xl border-dashed gap-2 text-sm text-muted hover:text-main cursor-pointer flex items-center justify-center">
          <ImagePlus size={15} />
          {hasMedia ? (tr ? 'Daha fazla ekle' : 'Add more') : (tr ? 'Fotoğraf veya video seç' : 'Select photos or videos')}
          <input type="file" className="sr-only" accept="image/*,video/*" multiple onChange={onFileChange} />
        </label>

        {isNew && (
          <p className="text-[10px] text-subtle">
            {tr ? 'Oda oluşturulunca dosyalar otomatik yüklenir.' : 'Files upload automatically after creation.'}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={onSubmit}
          disabled={submitting || !name.trim() || !roomTypeId || !basePrice || !maxAdults}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-card text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          {submitting
            ? (isNew && pendingItems.length > 0
                ? (tr ? 'Oluşturuluyor ve yükleniyor...' : 'Creating & uploading...')
                : (tr ? (isNew ? 'Oluşturuluyor...' : 'Kaydediliyor...') : (isNew ? 'Creating...' : 'Saving...')))
            : (isNew ? (tr ? 'Oda Ekle' : 'Add Room') : (tr ? 'Kaydet' : 'Save Changes'))}
        </button>
        <button onClick={onCancel} className="btn-secondary px-5 py-2.5 rounded-card text-sm">
          {tr ? 'İptal' : 'Cancel'}
        </button>
      </div>

    </div>
  );
}
