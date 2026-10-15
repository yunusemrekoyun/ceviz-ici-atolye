"use client";

import { useState } from "react";
import { MapPin, Phone, Users, Edit2, Trash2, Plus, X, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import { PhoneInput } from "@/components/ui/PhoneInput";

interface Branch {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  isActive: boolean;
  createdAt: string;
  _count: { members: number; attendances: number };
}

interface FormState {
  name: string;
  city: string;
  address: string;
  phone: string;
  lat: string;
  lng: string;
  isActive: boolean;
}

const EMPTY: FormState = { name: "", city: "", address: "", phone: "", lat: "", lng: "", isActive: true };

function branchToForm(b: Branch): FormState {
  return {
    name: b.name,
    city: b.city ?? "",
    address: b.address ?? "",
    phone: b.phone ?? "",
    lat: b.lat != null ? String(b.lat) : "",
    lng: b.lng != null ? String(b.lng) : "",
    isActive: b.isActive,
  };
}

export function BranchesClient({ initialBranches }: { initialBranches: Branch[] }) {
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setModalOpen(true);
  }

  function openEdit(b: Branch) {
    setEditing(b);
    setForm(branchToForm(b));
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast({ type: "error", message: "Şube adı zorunludur." });
    setSaving(true);
    const body = {
      name: form.name.trim(),
      city: form.city.trim() || undefined,
      address: form.address.trim() || undefined,
      phone: form.phone.trim() || undefined,
      lat: form.lat ? parseFloat(form.lat) : undefined,
      lng: form.lng ? parseFloat(form.lng) : undefined,
      isActive: form.isActive,
    };
    try {
      if (editing) {
        const updated = await api.patch<Branch>(`/api/branches/${editing.id}`, body);
        setBranches((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));
        toast({ type: "success", message: "Şube güncellendi." });
      } else {
        const created = await api.post<Branch>("/api/branches", body);
        setBranches((prev) => [{ ...created, _count: { members: 0, attendances: 0 } }, ...prev]);
        toast({ type: "success", message: "Şube oluşturuldu." });
      }
      closeModal();
    } catch (err: any) {
      toast({ type: "error", message: err.message || "Bir hata oluştu." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.del(`/api/branches/${deleteTarget.id}`);
      setBranches((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      toast({ type: "success", message: `"${deleteTarget.name}" silindi.` });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ type: "error", message: err.message || "Silinemedi." });
    } finally {
      setDeleting(false);
    }
  }

  async function toggleActive(b: Branch) {
    try {
      const updated = await api.patch<Branch>(`/api/branches/${b.id}`, { isActive: !b.isActive });
      setBranches((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
      toast({ type: "success", message: updated.isActive ? "Şube aktifleştirildi." : "Şube pasife alındı." });
    } catch {
      toast({ type: "error", message: "Durum güncellenemedi." });
    }
  }

  return (
    <>
      {/* Header actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Şubeler</h1>
          <p className="text-sm text-label mt-1">{branches.length} şube kayıtlı</p>
        </div>
        <button onClick={openCreate} className="btn-primary btn-md">
          <Plus className="w-4 h-4" /> Yeni Şube
        </button>
      </div>

      {/* Branch grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.length === 0 && (
          <div className="card-surface p-10 text-center text-muted col-span-full">
            Henüz şube yok. "Yeni Şube" ile başlayın.
          </div>
        )}
        {branches.map((b) => (
          <div key={b.id} className="card-surface p-6 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-lg truncate">{b.name}</div>
                {b.city && <div className="text-xs text-body mt-0.5">{b.city}</div>}
              </div>
              <button
                onClick={() => toggleActive(b)}
                className="flex-shrink-0"
                title={b.isActive ? "Pasife al" : "Aktifleştir"}
              >
                {b.isActive
                  ? <CheckCircle className="w-5 h-5 text-emerald-400" />
                  : <XCircle className="w-5 h-5 text-faint" />}
              </button>
            </div>

            <div className="space-y-1.5 text-sm text-dim">
              {b.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-neon flex-shrink-0" />
                  <span>{b.address}</span>
                </div>
              )}
              {b.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-neon flex-shrink-0" />
                  <span>{b.phone}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-subtle flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm">
                <Users className="w-4 h-4 text-neon" />
                <span className="font-bold text-neon">{b._count.members}</span>
                <span className="text-muted text-xs">üye</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(b)}
                  className="p-1.5 rounded-lg hover:bg-subtle text-label hover:text-white transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(b)}
                  className="p-1.5 rounded-lg hover:bg-rose-500/10 text-label hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-lg card-surface rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">{editing ? "Şubeyi Düzenle" : "Yeni Şube"}</h2>
              <button onClick={closeModal} className="p-1 rounded-lg hover:bg-subtle text-label">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs text-body mb-1.5">Şube Adı *</label>
                <input
                  className="input w-full"
                  placeholder="Merkez Şube"
                  value={form.name}
                  onChange={field("name")}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-body mb-1.5">Şehir</label>
                  <input className="input w-full" placeholder="İstanbul" value={form.city} onChange={field("city")} />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Telefon</label>
                  <PhoneInput className="input w-full" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-body mb-1.5">Adres</label>
                <input className="input w-full" placeholder="Caddesi No:1" value={form.address} onChange={field("address")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-body mb-1.5">Enlem</label>
                  <input className="input w-full" type="number" step="any" placeholder="41.0082" value={form.lat} onChange={field("lat")} />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Boylam</label>
                  <input className="input w-full" type="number" step="any" placeholder="28.9784" value={form.lng} onChange={field("lng")} />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-neon rounded"
                  checked={form.isActive}
                  onChange={field("isActive")}
                />
                <span className="text-sm text-dim">Şube aktif</span>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary btn-md">İptal</button>
                <button type="submit" disabled={saving} className="btn-primary btn-md min-w-[100px]">
                  {saving ? "Kaydediliyor…" : editing ? "Güncelle" : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm card-surface rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 grid place-items-center text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold">Şubeyi Sil</div>
                <div className="text-xs text-label">Bu işlem geri alınamaz</div>
              </div>
            </div>
            <p className="text-sm text-dim mb-5">
              <span className="text-strong font-medium">"{deleteTarget.name}"</span> şubesini silmek istediğinize emin misiniz?
              {deleteTarget._count.members > 0 && (
                <span className="block mt-1 text-amber-300 text-xs">
                  Bu şubede {deleteTarget._count.members} üye kayıtlı — silme engellenecek.
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary btn-md flex-1">İptal</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-medium text-sm transition-colors disabled:opacity-50"
              >
                {deleting ? "Siliniyor…" : "Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
