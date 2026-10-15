"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PhoneInput } from "@/components/ui/PhoneInput";

type Plan = { id: string; name: string; price: any; durationDays: number };
type Trainer = { id: string; user: { name: string } };
type Branch = { id: string; name: string };

export type MemberInitial = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string | null;
  status?: string;
  gender?: string | null;
  birthDate?: string | Date | null;
  heightCm?: number | null;
  startWeightKg?: number | null;
  goal?: string | null;
  healthNotes?: string | null;
  trainerId?: string | null;
  branchId?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: MemberInitial;
  plans: Plan[];
  trainers: Trainer[];
  branches: Branch[];
};

const empty: MemberInitial = {
  name: "", email: "", phone: "", status: "PENDING",
  gender: "", birthDate: "", heightCm: null, startWeightKg: null,
  goal: "", healthNotes: "", trainerId: "", branchId: "",
};

export function MemberDialog({ open, onClose, initial, plans, trainers, branches }: Props) {
  const router = useRouter();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState<any>(empty);
  const [planId, setPlanId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("CARD");
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState("PAID");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        ...empty,
        ...(initial || {}),
        birthDate: initial?.birthDate
          ? new Date(initial.birthDate as any).toISOString().slice(0, 10)
          : "",
      });
      setPlanId("");
      setPaymentAmount("");
      setPassword("");
      setErr(null);
    }
  }, [open, initial]);

  const onChange = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true); setErr(null);
    try {
      const payload: any = { ...form };
      if (!isEdit) {
        if (password) payload.password = password;
        if (planId) {
          payload.planId = planId;
          payload.paymentMethod = paymentMethod;
          payload.paymentStatus = paymentStatus;
          if (paymentAmount) payload.paymentAmount = paymentAmount;
        }
      }
      const url = isEdit ? `/api/members/${initial!.id}` : "/api/members";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "İşlem başarısız");
      onClose();
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={isEdit ? "Üye Düzenle" : "Yeni Üye Ekle"}
      description={isEdit ? "Üye bilgilerini güncelle" : "Yeni üye kaydı oluştur, isteğe bağlı plan ata"}
      footer={
        <>
          <button onClick={onClose} className="btn-ghost btn-md">Vazgeç</button>
          <button onClick={submit} disabled={loading} className="btn-primary btn-md">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> :
              isEdit ? <><Save className="w-4 h-4" />Kaydet</> : <><UserPlus className="w-4 h-4" />Üye Oluştur</>}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* TEMEL */}
        <Section title="Temel Bilgiler">
          <Field label="Ad Soyad *" className="col-span-2">
            <input className="input-base" value={form.name || ""} onChange={(e) => onChange("name", e.target.value)} required />
          </Field>
          <Field label="E-posta *">
            <input type="email" className="input-base" value={form.email || ""} onChange={(e) => onChange("email", e.target.value)} required />
          </Field>
          <Field label="Telefon">
            <PhoneInput className="input-base" value={form.phone || ""} onChange={(v) => onChange("phone", v)} />
          </Field>
          {!isEdit && (
            <Field label="Geçici Şifre" hint="Boş bırakılırsa 'geciciSifre123' atanır">
              <input className="input-base" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Otomatik" />
            </Field>
          )}
          {isEdit && (
            <Field label="Durum">
              <select className="input-base" value={form.status || "ACTIVE"} onChange={(e) => onChange("status", e.target.value)}>
                <option value="ACTIVE">Aktif</option>
                <option value="EXPIRED">Pasif</option>
                <option value="FROZEN">Donduruldu</option>
                <option value="SUSPENDED">Askıda</option>
              </select>
            </Field>
          )}
        </Section>

        {/* KİŞİSEL */}
        <Section title="Kişisel & Sağlık">
          <Field label="Cinsiyet">
            <select className="input-base" value={form.gender || ""} onChange={(e) => onChange("gender", e.target.value)}>
              <option value="">Seçilmedi</option>
              <option value="MALE">Erkek</option>
              <option value="FEMALE">Kadın</option>
              <option value="OTHER">Diğer</option>
            </select>
          </Field>
          <Field label="Doğum Tarihi">
            <input type="date" className="input-base" value={form.birthDate || ""} onChange={(e) => onChange("birthDate", e.target.value)} />
          </Field>
          <Field label="Boy (cm)">
            <input type="number" className="input-base" value={form.heightCm || ""} onChange={(e) => onChange("heightCm", e.target.value)} />
          </Field>
          <Field label="Başlangıç Kilo (kg)">
            <input type="number" step="0.1" className="input-base" value={form.startWeightKg || ""} onChange={(e) => onChange("startWeightKg", e.target.value)} />
          </Field>
          <Field label="Hedef" className="col-span-2">
            <input className="input-base" value={form.goal || ""} onChange={(e) => onChange("goal", e.target.value)} placeholder="Örn: 8 kg vermek, kas oranını artırmak" />
          </Field>
          <Field label="Sağlık Notları" className="col-span-2">
            <textarea rows={2} className="input-base" value={form.healthNotes || ""} onChange={(e) => onChange("healthNotes", e.target.value)} placeholder="Alerjiler, kronik rahatsızlıklar, sakatlık geçmişi..." />
          </Field>
        </Section>

        {/* ATAMA */}
        <Section title="Atama">
          <Field label="Şube">
            <select className="input-base" value={form.branchId || ""} onChange={(e) => onChange("branchId", e.target.value)}>
              <option value="">Seçilmedi</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Eğitmen">
            <select className="input-base" value={form.trainerId || ""} onChange={(e) => onChange("trainerId", e.target.value)}>
              <option value="">Seçilmedi</option>
              {trainers.map((t) => <option key={t.id} value={t.id}>{t.user.name}</option>)}
            </select>
          </Field>
        </Section>

        {/* PLAN + ÖDEME (sadece yeni ekleme) */}
        {!isEdit && (
          <Section title="Üyelik Planı (Opsiyonel)">
            <Field label="Plan" className="col-span-2">
              <select className="input-base" value={planId} onChange={(e) => {
                setPlanId(e.target.value);
                const p = plans.find((x) => x.id === e.target.value);
                if (p) setPaymentAmount(String(Number(p.price)));
              }}>
                <option value="">Plan atama (üye PENDING durumunda kalır)</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — ₺{Number(p.price).toLocaleString("tr-TR")} ({p.durationDays} gün)</option>)}
              </select>
            </Field>
            {planId && (
              <>
                <Field label="Ödeme Tutarı (₺)">
                  <input type="number" className="input-base" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                </Field>
                <Field label="Yöntem">
                  <select className="input-base" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="CARD">Kredi/Banka Kartı</option>
                    <option value="CASH">Nakit</option>
                    <option value="TRANSFER">Havale/EFT</option>
                    <option value="IYZICO">iyzico</option>
                    <option value="PAYTR">PayTR</option>
                  </select>
                </Field>
                <Field label="Ödeme Durumu">
                  <select className="input-base" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                    <option value="PAID">Ödendi</option>
                    <option value="PENDING">Beklemede</option>
                  </select>
                </Field>
              </>
            )}
          </Section>
        )}

        {err && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{err}</div>}
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-widest text-muted uppercase mb-3">{title}</div>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, className = "", children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="label-base">{label}</label>
      {children}
      {hint && <div className="text-[11px] text-muted mt-1">{hint}</div>}
    </div>
  );
}
