"use client";

import { useState } from "react";
import { Plus, X, Shield, User as UserIcon, CheckCircle, XCircle, Mail, Phone } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { initials } from "@/lib/utils";
import { api } from "@/lib/api";

type StaffRole = "ADMIN" | "STAFF";
interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface FormState { name: string; email: string; phone: string; role: StaffRole }
const EMPTY_FORM: FormState = { name: "", email: "", phone: "", role: "STAFF" };

const ROLE_LABEL: Record<StaffRole, string> = { ADMIN: "Yönetici", STAFF: "Personel" };

function fmtDate(d: string | null) {
  if (!d) return "Hiç giriş yapmadı";
  return new Date(d).toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function EkipClient({ initialStaff, currentUserId }: { initialStaff: Staff[]; currentUserId: string }) {
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  function field(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post<Staff>("/api/staff", {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
      });
      const all = await api.get<Staff[]>("/api/staff");
      setStaff(all);
      toast({ type: "success", message: "Hesap oluşturuldu. Şifre belirleme bağlantısı e-postasına gönderildi." });
      setModal(false);
      setForm(EMPTY_FORM);
    } catch (e: any) {
      toast({ type: "error", message: e.message || "Hata oluştu." });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: Staff) {
    setBusyId(s.id);
    try {
      const updated = await api.patch<Staff>(`/api/staff/${s.id}`, { isActive: !s.isActive });
      setStaff((prev) => prev.map((x) => (x.id === s.id ? { ...x, isActive: updated.isActive } : x)));
      toast({ type: "success", message: updated.isActive ? "Hesap aktifleştirildi." : "Hesap devre dışı bırakıldı." });
    } catch (e: any) {
      toast({ type: "error", message: e.message || "Durum güncellenemedi." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ekip</h1>
          <p className="text-sm text-label mt-1">{staff.length} yönetici / personel hesabı</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary btn-md"><Plus className="w-4 h-4" /> Yeni Personel</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((s) => {
          const isSelf = s.id === currentUserId;
          return (
            <div key={s.id} className={`card-surface p-5 flex flex-col gap-4 ${!s.isActive ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon to-accent-cyan grid place-items-center text-ink-950 font-bold">
                  {initials(s.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate flex items-center gap-1.5">
                    {s.name}
                    {isSelf && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-subtle text-label">sen</span>}
                  </div>
                  <div className="mt-0.5 inline-flex items-center gap-1 text-xs">
                    {s.role === "ADMIN"
                      ? <Shield className="w-3 h-3 text-neon" />
                      : <UserIcon className="w-3 h-3 text-accent-cyan" />}
                    <span className={s.role === "ADMIN" ? "text-neon" : "text-accent-cyan"}>{ROLE_LABEL[s.role]}</span>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                  {s.isActive ? "Aktif" : "Pasif"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-dim">
                <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-faint" /><span className="truncate">{s.email}</span></div>
                {s.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-faint" />{s.phone}</div>}
                <div className="text-muted pt-1">Son giriş: {fmtDate(s.lastLoginAt)}</div>
              </div>

              <div className="pt-1 border-t border-subtle">
                <button
                  onClick={() => toggleActive(s)}
                  disabled={isSelf || busyId === s.id}
                  title={isSelf ? "Kendi hesabını değiştiremezsin" : s.isActive ? "Devre dışı bırak" : "Aktifleştir"}
                  className="w-full btn-secondary btn-sm gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {s.isActive
                    ? <><XCircle className="w-3.5 h-3.5" /> Devre Dışı Bırak</>
                    : <><CheckCircle className="w-3.5 h-3.5" /> Aktifleştir</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModal(false)} />
          <div className="relative w-full max-w-md card-surface rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Yeni Personel</h2>
              <button onClick={() => setModal(false)} className="p-1 rounded-lg hover:bg-subtle text-label"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs text-body mb-1.5">Ad Soyad *</label>
                <input className="input w-full" placeholder="Ahmet Yılmaz" value={form.name} onChange={field("name")} required minLength={2} />
              </div>
              <div>
                <label className="block text-xs text-body mb-1.5">E-posta *</label>
                <input className="input w-full" type="email" placeholder="ahmet@..." value={form.email} onChange={field("email")} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-body mb-1.5">Telefon</label>
                  <input className="input w-full" placeholder="0555..." value={form.phone} onChange={field("phone")} />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Rol *</label>
                  <select className="input w-full" value={form.role} onChange={field("role")}>
                    <option value="STAFF">Personel</option>
                    <option value="ADMIN">Yönetici</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-muted">
                Hesap oluşturulunca kişiye şifre belirleme bağlantısı e-posta ile gönderilir. Yönetici ile personel şu an aynı yetkilere sahiptir.
              </p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary btn-md flex-1">İptal</button>
                <button type="submit" disabled={saving} className="btn-primary btn-md flex-1">
                  {saving ? "Oluşturuluyor…" : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
