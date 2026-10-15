'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, X, Film, Trash2, Loader2, BedDouble, ImagePlus, Pencil, AlertTriangle } from 'lucide-react';
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

interface RoomType {
  id: string;
  name: string;
  amenities: string[];
  isActive: boolean;
  media: MediaItem[];
}

// ── Component ────────────────────────────────────────────────────────────────

export function RoomTypeManager({ viewMode = 'list' }: { viewMode?: 'card' | 'list' }) {
  const { language } = useLanguage();
  const tr = language === 'tr';
  const toast = useToast();

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Create form state ─────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [amenityInput, setAmenityInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [pendingItems, setPendingItems] = useState<{ file: File; objectUrl: string }[]>([]);

  // ── Edit state ────────────────────────────────────────────────────────────
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmenities, setEditAmenities] = useState<string[]>([]);
  const [editAmenityInput, setEditAmenityInput] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Delete state — two phases: 'confirm' (simple) → 'warning' (rooms exist)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    phase: 'confirm' | 'warning';
    rooms: { id: string; name: string }[];
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);


  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchRoomTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/room-types');
      const data = await res.json();
      if (data.ok) setRoomTypes(data.roomTypes);
    } catch (err) {
      console.error('Failed to fetch room types:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoomTypes(); }, [fetchRoomTypes]);

  // ── Create handlers ────────────────────────────────────────────────────────

  const handleAmenityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = amenityInput.trim();
      if (val && !amenities.includes(val)) setAmenities(prev => [...prev, val]);
      setAmenityInput('');
    }
  };

  const removeAmenity = (index: number) => setAmenities(prev => prev.filter((_, i) => i !== index));

  const resetForm = () => {
    setShowForm(false);
    setName('');
    setAmenities([]);
    setAmenityInput('');
    setPendingItems(prev => { prev.forEach(p => URL.revokeObjectURL(p.objectUrl)); return []; });
  };

  const handleFormFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newItems = Array.from(files).map(file => ({
      file,
      objectUrl: URL.createObjectURL(file),
    }));
    setPendingItems(prev => [...prev, ...newItems]);
    e.target.value = '';
  };

  const removePendingItem = (index: number) => {
    setPendingItems(prev => {
      URL.revokeObjectURL(prev[index].objectUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/room-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), amenities }),
      });
      const data = await res.json();
      if (!data.ok) return;

      const newRoomType: RoomType = { ...data.roomType, media: [] };

      if (pendingItems.length > 0) {
        const uploadedMedia: MediaItem[] = [];
        for (const { file } of pendingItems) {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('entityType', 'room_type');
          fd.append('entityId', newRoomType.id);
          try {
            const r = await fetch('/api/media/upload', { method: 'POST', body: fd });
            const d = await r.json();
            if (d.ok) uploadedMedia.push(d.media);
          } catch { /* silent */ }
        }
        newRoomType.media = uploadedMedia;
        pendingItems.forEach(p => URL.revokeObjectURL(p.objectUrl));
      }

      setRoomTypes(prev => [...prev, newRoomType]);
      resetForm();
      toast.success(
        tr ? 'Oda çeşidi oluşturuldu' : 'Room type created',
        newRoomType.name,
      );
    } catch (err) {
      console.error('Failed to create room type:', err);
      toast.error(tr ? 'Oluşturma başarısız' : 'Creation failed');
    } finally {
      setCreating(false);
    }
  };

  // ── Edit handlers ──────────────────────────────────────────────────────────

  const openEdit = (rt: RoomType) => {
    setEditingRoomType(rt);
    setEditName(rt.name);
    setEditAmenities([...rt.amenities]);
    setEditAmenityInput('');
  };

  const closeEdit = () => {
    setEditingRoomType(null);
    setEditName('');
    setEditAmenities([]);
    setEditAmenityInput('');
  };

  const handleEditAmenityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = editAmenityInput.trim();
      if (val && !editAmenities.includes(val)) setEditAmenities(prev => [...prev, val]);
      setEditAmenityInput('');
    }
  };

  const removeEditAmenity = (index: number) => setEditAmenities(prev => prev.filter((_, i) => i !== index));

  const handleSaveEdit = async () => {
    if (!editingRoomType || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/room-types/${editingRoomType.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), amenities: editAmenities }),
      });
      const data = await res.json();
      if (data.ok) {
        setRoomTypes(prev =>
          prev.map(rt =>
            rt.id === editingRoomType.id
              ? { ...rt, name: data.roomType.name, amenities: data.roomType.amenities }
              : rt
          )
        );
        closeEdit();
        toast.success(tr ? 'Değişiklikler kaydedildi' : 'Changes saved');
      } else {
        toast.error(tr ? 'Kaydetme başarısız' : 'Save failed');
      }
    } catch (err) {
      console.error('Failed to update room type:', err);
      toast.error(tr ? 'Kaydetme başarısız' : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete handlers ────────────────────────────────────────────────────────

  // Step 1: clicking trash always opens simple confirm first (no API call yet)
  const initiateDelete = (rt: RoomType) => {
    setDeleteTarget({ id: rt.id, name: rt.name, phase: 'confirm', rooms: [] });
  };

  // Step 2: user confirms in modal → try delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/room-types/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.status === 409 && data.conflict) {
        // Rooms exist → escalate to warning phase inside same modal
        setDeleteTarget(prev => prev ? { ...prev, phase: 'warning', rooms: data.rooms } : null);
        return;
      }

      if (data.ok) {
        setRoomTypes(prev => prev.filter(t => t.id !== deleteTarget.id));
        setDeleteTarget(null);
        toast.success(tr ? 'Oda çeşidi silindi' : 'Room type deleted', deleteTarget.name);
      } else {
        toast.error(tr ? 'Silme başarısız' : 'Delete failed');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error(tr ? 'Silme başarısız' : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  // Step 3: user force-confirms knowing rooms will also be deleted
  const handleForceDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/room-types/${deleteTarget.id}?force=true`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setRoomTypes(prev => prev.filter(t => t.id !== deleteTarget.id));
        setDeleteTarget(null);
        toast.success(
          tr ? 'Oda çeşidi ve odalar silindi' : 'Room type and rooms deleted',
          `${deleteTarget.rooms.length} ${tr ? 'oda da silindi' : 'rooms also deleted'}`,
        );
      } else {
        toast.error(tr ? 'Silme başarısız' : 'Delete failed');
      }
    } catch (err) {
      console.error('Force delete failed:', err);
      toast.error(tr ? 'Silme başarısız' : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Card media upload ──────────────────────────────────────────────────────

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, roomTypeId: string) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', 'room_type');
      formData.append('entityId', roomTypeId);
      try {
        const res = await fetch('/api/media/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.ok) {
          setRoomTypes(prev =>
            prev.map(rt => rt.id === roomTypeId ? { ...rt, media: [...rt.media, data.media] } : rt)
          );
        }
      } catch { /* silent */ }
    }

    e.target.value = '';
  };

  const handleDeleteMedia = async (mediaId: string, roomTypeId: string) => {
    try {
      const res = await fetch(`/api/media/${mediaId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setRoomTypes(prev =>
          prev.map(rt =>
            rt.id === roomTypeId ? { ...rt, media: rt.media.filter(m => m.id !== mediaId) } : rt
          )
        );
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
          <p className="text-sm font-medium text-white/60">
            {tr
              ? `${roomTypes.length} oda çeşidi tanımlı`
              : `${roomTypes.length} room type${roomTypes.length !== 1 ? 's' : ''} defined`}
          </p>
          <p className="section-title mt-0.5">
            {tr ? 'Medya ve imkanlarıyla birlikte yönetin' : 'Manage with their media and amenities'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-card text-sm"
        >
          <Plus size={15} />
          {tr ? 'Yeni Oda Çeşidi' : 'New Room Type'}
        </button>
      </div>

      {/* ── Create Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={tr ? 'Yeni Oda Çeşidi' : 'New Room Type'}
        description={tr ? 'Bilgileri doldurun ve kaydedin' : 'Fill in the details and save'}
      >
        <div className="space-y-5">

          <div className="space-y-2">
            <label className="label-sm">{tr ? 'Oda Adı' : 'Room Name'}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={tr ? 'Örn: Sultan Suit, Jakuzi Oda...' : 'e.g. Sultan Suite, Jacuzzi Room...'}
              className="input-base"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="label-sm">{tr ? 'İmkanlar' : 'Amenities'}</label>
            {amenities.length > 0 && (
              <div className="surface-card flex flex-wrap gap-2 p-3">
                {amenities.map((a, i) => (
                  <span key={i} className="tag tag-accent inline-flex items-center gap-1.5">
                    {a}
                    <button type="button" onClick={() => removeAmenity(i)} className="hover:text-white/80 transition-colors cursor-pointer">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              value={amenityInput}
              onChange={e => setAmenityInput(e.target.value)}
              onKeyDown={handleAmenityKeyDown}
              placeholder={tr ? "Wi-Fi, Klima, Jakuzi... → Enter'a bas" : "Wi-Fi, AC, Jacuzzi... → press Enter"}
              className="input-base"
            />
          </div>

          <div className="space-y-2">
            <span className="label-sm">{tr ? 'Medya (opsiyonel)' : 'Media (optional)'}</span>

            {pendingItems.length > 0 && (
              <div className="surface-card flex flex-wrap gap-2 p-3">
                {pendingItems.map(({ file, objectUrl }, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-m-border media-placeholder shrink-0">
                    {file.type.startsWith('video/') ? (
                      <video src={objectUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={objectUrl} alt={file.name} className="w-full h-full object-cover" />
                    )}
                    <button type="button" onClick={() => removePendingItem(i)} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full overlay-control flex items-center justify-center hover:text-red-400 transition-colors">
                      <X size={8} className="text-current" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* label wraps the input directly — works reliably inside portals */}
            <label className="btn-secondary w-full py-3 rounded-xl border-dashed gap-2 text-sm text-muted hover:text-main cursor-pointer">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                className="sr-only"
                onChange={handleFormFileChange}
              />
              <ImagePlus size={15} />
              {pendingItems.length > 0 ? (tr ? 'Daha fazla ekle' : 'Add more') : (tr ? 'Fotoğraf veya video seç' : 'Select photos or videos')}
            </label>
            <p className="text-[10px] text-subtle">
              {tr ? 'Oluşturunca dosyalar otomatik yüklenir.' : 'Files upload automatically after creation.'}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-card text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating && <Loader2 size={14} className="animate-spin" />}
              {creating
                ? (pendingItems.length > 0
                    ? (tr ? 'Oluşturuluyor ve yükleniyor...' : 'Creating & uploading...')
                    : (tr ? 'Oluşturuluyor...' : 'Creating...'))
                : (tr ? 'Oda Çeşidi Oluştur' : 'Create Room Type')}
            </button>
            <button onClick={resetForm} className="btn-secondary px-5 py-2.5 rounded-card text-sm">
              {tr ? 'İptal' : 'Cancel'}
            </button>
          </div>

        </div>
      </Modal>

      {/* ── Edit Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={!!editingRoomType}
        onClose={closeEdit}
        title={tr ? 'Oda Çeşidini Düzenle' : 'Edit Room Type'}
        description={editingRoomType?.name}
      >
        <div className="space-y-5">

          <div className="space-y-2">
            <label className="label-sm">{tr ? 'Oda Adı' : 'Room Name'}</label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="input-base"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="label-sm">{tr ? 'İmkanlar' : 'Amenities'}</label>
            {editAmenities.length > 0 && (
              <div className="surface-card flex flex-wrap gap-2 p-3">
                {editAmenities.map((a, i) => (
                  <span key={i} className="tag tag-accent inline-flex items-center gap-1.5">
                    {a}
                    <button type="button" onClick={() => removeEditAmenity(i)} className="hover:text-white/80 transition-colors cursor-pointer">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              value={editAmenityInput}
              onChange={e => setEditAmenityInput(e.target.value)}
              onKeyDown={handleEditAmenityKeyDown}
              placeholder={tr ? "Wi-Fi, Klima... → Enter'a bas" : "Wi-Fi, AC... → press Enter"}
              className="input-base"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSaveEdit}
              disabled={saving || !editName.trim()}
              className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-card text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : (tr ? 'Kaydet' : 'Save Changes')}
            </button>
            <button onClick={closeEdit} className="btn-secondary px-5 py-2.5 rounded-card text-sm">
              {tr ? 'İptal' : 'Cancel'}
            </button>
          </div>

        </div>
      </Modal>

      {/* ── Delete confirmation modal ─────────────────────────── */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={
          deleteTarget?.phase === 'warning'
            ? (tr ? 'Dikkat — Kayıtlı odalar var' : 'Warning — Rooms exist')
            : (tr ? 'Oda çeşidini sil' : 'Delete room type')
        }
        size="sm"
      >
        {deleteTarget && deleteTarget.phase === 'confirm' && (
          <div className="space-y-4">
            <p className="text-sm text-white/60 leading-relaxed">
              {tr
                ? <><span className="font-semibold text-white/90">"{deleteTarget.name}"</span> oda çeşidi kalıcı olarak silinecek. Bu işlem geri alınamaz.</>
                : <>Room type <span className="font-semibold text-white/90">"{deleteTarget.name}"</span> will be permanently deleted. This cannot be undone.</>}
            </p>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleConfirmDelete}
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

        {deleteTarget && deleteTarget.phase === 'warning' && (
          <div className="space-y-4">
            <div className="flex gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-300">
                  {tr ? 'Bu oda çeşidine kayıtlı odalar var!' : 'This room type has assigned rooms!'}
                </p>
                <p className="text-[11px] text-amber-400/70 leading-relaxed">
                  {tr
                    ? 'Silerseniz aşağıdaki odalar da kalıcı olarak silinir. Odaları korumak istiyorsanız önce başka bir çeşide atayın.'
                    : 'Deleting will also permanently delete the rooms below. To keep the rooms, first reassign them to another type.'}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="section-title">{tr ? 'Silinecek odalar' : 'Rooms that will be deleted'}</p>
              <div className="rounded-xl border border-m-border overflow-hidden">
                {deleteTarget.rooms.map((room, i) => (
                  <div key={room.id} className={`px-4 py-2.5 flex items-center gap-2 text-sm ${i < deleteTarget.rooms.length - 1 ? 'border-b border-m-border' : ''}`}>
                    <BedDouble size={13} className="text-subtle shrink-0" />
                    <span className="text-muted">{room.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleForceDelete}
                disabled={!!deletingId}
                className="flex items-center gap-2 px-5 py-2.5 rounded-card text-sm font-semibold bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {deletingId && <Loader2 size={14} className="animate-spin" />}
                {tr ? 'Yine de sil' : 'Delete anyway'}
              </button>
              <button onClick={() => setDeleteTarget(null)} className="btn-primary px-5 py-2.5 rounded-card text-sm">
                {tr ? 'İptal — Odaları yeniden ata' : 'Cancel — Reassign rooms'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Empty state ───────────────────────────────────────── */}
      {roomTypes.length === 0 && !showForm && (
        <div className="panel-glass-dashed">
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl surface-soft flex items-center justify-center">
              <BedDouble size={28} className="text-faint" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-muted">
                {tr ? 'Henüz oda çeşidi eklenmedi' : 'No room types added yet'}
              </p>
              <p className="text-xs text-subtle max-w-xs leading-relaxed">
                {tr ? 'İlk oda çeşidinizi oluşturmak için yukarıdaki butona tıklayın.' : 'Click the button above to create your first room type.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Room type list / card view ────────────────────────── */}
      {roomTypes.length > 0 && (viewMode === 'card' ? (

        /* ══ CARD GRID ══ */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {roomTypes.map(rt => {
            const cover = rt.media[0];
            const coverSrc = cover
              ? (cover.pathThumb ? `/uploads/${cover.pathThumb}` : `/uploads/${cover.pathOriginal}`)
              : null;
            const coverIsVideo = cover?.mimeType.startsWith('video/') ?? false;

            return (
              <div
                key={rt.id}
                className="surface-card-raised overflow-hidden group hover:border-brand-accent/25 transition-all duration-200 flex flex-col"
              >
                {/* Cover */}
                <div className="relative shrink-0" style={{ aspectRatio: '5/2' }}>
                  {coverSrc ? (
                    coverIsVideo ? (
                      <video src={`/uploads/${cover!.pathOriginal}`} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverSrc} alt={rt.name} className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="w-full h-full media-placeholder flex flex-col items-center justify-center gap-3">
                      <BedDouble size={24} className="text-brand-accent/25" />
                      <span className="text-[11px] text-faint font-semibold uppercase tracking-widest">{rt.name}</span>
                    </div>
                  )}

                  {/* Active badge — top left */}
                  <div className="absolute top-2.5 left-2.5">
                    <span
                      className={`tag ${rt.isActive ? 'tag-success' : 'tag-muted'} text-[10px]`}
                    >
                      {rt.isActive ? (tr ? 'Aktif' : 'Active') : (tr ? 'Pasif' : 'Inactive')}
                    </span>
                  </div>

                  {/* Edit / Delete — top right, hover */}
                  <div className="absolute top-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(rt)}
                      className="w-7 h-7 rounded-lg overlay-control flex items-center justify-center transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                    {deletingId === rt.id ? (
                      <div className="w-7 h-7 rounded-lg overlay-control flex items-center justify-center">
                        <Loader2 size={12} className="animate-spin text-subtle" />
                      </div>
                    ) : (
                      <button
                        onClick={() => initiateDelete(rt)}
                        className="w-7 h-7 rounded-lg overlay-control flex items-center justify-center hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>

                  {/* Add media — bottom right */}
                  <label
                    className="absolute bottom-2.5 right-2.5 w-7 h-7 rounded-lg overlay-control flex items-center justify-center cursor-pointer transition-colors"
                  >
                    <input type="file" accept="image/*,video/*" multiple className="sr-only" onChange={e => handleFileChange(e, rt.id)} />
                    <ImagePlus size={12} />
                  </label>

                  {/* Media count — bottom left */}
                  {rt.media.length > 0 && (
                    <div
                      className="absolute bottom-2.5 left-2.5 overlay-control flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
                    >
                      <Film size={9} />
                      {rt.media.length}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 p-3 border-t border-m-border">
                  <h3 className="font-bold text-main text-base leading-none truncate">{rt.name}</h3>
                  <p className="text-[11px] text-subtle mt-1">
                    {rt.amenities.length} {tr ? 'imkan' : 'amenity'}
                    {' · '}
                    {rt.media.length} {tr ? 'medya' : 'media'}
                  </p>
                  {rt.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {rt.amenities.slice(0, 4).map((a, i) => (
                        <span key={i} className="tag tag-muted text-[10px]">{a}</span>
                      ))}
                      {rt.amenities.length > 4 && (
                        <span className="tag tag-muted text-[10px] text-subtle">+{rt.amenities.length - 4}</span>
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
          {roomTypes.map(rt => (
            <div key={rt.id} className="panel-glass-raised">

              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--app-accent) 6%, transparent) 0%, transparent 60%)' }}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center shrink-0">
                    <BedDouble size={18} className="text-brand-accent" />
                  </div>
                  <div>
                    <h3 className="font-bold text-main">{rt.name}</h3>
                    <p className="text-[11px] text-subtle mt-0.5">
                      {rt.amenities.length} {tr ? 'imkan' : 'amenity'}
                      {' · '}
                      {rt.media.length} {tr ? 'medya dosyası' : 'media file'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className={`tag ${rt.isActive ? 'tag-success' : 'tag-muted'}`}>
                    {rt.isActive ? (tr ? 'Aktif' : 'Active') : (tr ? 'Pasif' : 'Inactive')}
                  </span>
                  <button onClick={() => openEdit(rt)} className="btn-secondary px-3 py-1.5 rounded-lg text-xs gap-1.5">
                    <Pencil size={13} />
                    {tr ? 'Düzenle' : 'Edit'}
                  </button>
                  {deletingId === rt.id ? (
                    <Loader2 size={14} className="animate-spin text-subtle" />
                  ) : (
                    <button
                      onClick={() => initiateDelete(rt)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-subtle hover:text-red-400 hover:bg-red-400/10 transition-all"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div className="px-5 py-3 border-t border-m-border">
                {rt.amenities.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {rt.amenities.map((a, i) => (
                      <span key={i} className="tag tag-muted">{a}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-subtle italic">
                    {tr ? 'Henüz imkan eklenmemiş' : 'No amenities added yet'}
                  </p>
                )}
              </div>

              <div className="px-5 pb-5 pt-3 border-t border-m-border">
                <p className="section-title mb-3">{tr ? 'Medya' : 'Media'}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {rt.media.map(m => {
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
                          onClick={() => handleDeleteMedia(m.id, rt.id)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full overlay-control flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                        >
                          <Trash2 size={11} className="text-current" />
                        </button>
                      </div>
                    );
                  })}

                  <label className="aspect-square rounded-xl border border-dashed border-m-border hover:border-brand-accent/40 flex items-center justify-center bg-m-surface hover:bg-brand-accent/5 transition-all cursor-pointer group">
                    <input type="file" accept="image/*,video/*" multiple className="sr-only" onChange={e => handleFileChange(e, rt.id)} />
                    <ImagePlus size={16} className="text-subtle group-hover:text-brand-accent/60 transition-colors" />
                  </label>
                </div>
              </div>

            </div>
          ))}
        </div>

      ))}
    </div>
  );
}
