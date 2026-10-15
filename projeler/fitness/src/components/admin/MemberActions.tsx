"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Loader2, RefreshCw, CreditCard, Activity, Ruler, QrCode, Pencil } from "lucide-react";
import { MemberDialog, type MemberInitial } from "./MemberDialog";

type Plan = { id: string; name: string; price: number; durationDays: number };

type Props = {
  memberId: string;
  member: MemberInitial;
  plans: Plan[];
  trainers: { id: string; user: { name: string } }[];
  branches: { id: string; name: string }[];
};

export function MemberActions({ memberId, member, plans, trainers, branches }: Props) {
  const router = useRouter();
  const [openType, setOpenType] = useState<null | "renew" | "payment" | "checkin" | "measurement" | "qr" | "edit">(null);
  const close = () => setOpenType(null);
  const refresh = () => { close(); router.refresh(); };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setOpenType("checkin")} className="btn-secondary btn-md"><Activity className="w-4 h-4" />Check-in</button>
        <button onClick={() => setOpenType("measurement")} className="btn-secondary btn-md"><Ruler className="w-4 h-4" />Ölçüm</button>
        <button onClick={() => setOpenType("renew")} className="btn-secondary btn-md"><RefreshCw className="w-4 h-4" />Üyelik Yenile</button>
        <button onClick={() => setOpenType("qr")} className="btn-secondary btn-md"><QrCode className="w-4 h-4" />QR Kart</button>
        <button onClick={() => setOpenType("edit")} className="btn-secondary btn-md"><Pencil className="w-4 h-4" />Düzenle</button>
        <button onClick={() => setOpenType("payment")} className="btn-primary btn-md"><CreditCard className="w-4 h-4" />Ödeme Al</button>
      </div>

      <CheckInModal open={openType === "checkin"} onClose={close} memberId={memberId} onDone={refresh} />
      <MeasurementModal open={openType === "measurement"} onClose={close} memberId={memberId} onDone={refresh} />
      <RenewModal open={openType === "renew"} onClose={close} memberId={memberId} plans={plans} onDone={refresh} />
      <PaymentModal open={openType === "payment"} onClose={close} memberId={memberId} plans={plans} onDone={refresh} />
      <QRModal open={openType === "qr"} onClose={close} member={member} memberId={memberId} />
      <MemberDialog
        open={openType === "edit"} onClose={close}
        initial={{ id: memberId, ...member }}
        plans={plans} trainers={trainers} branches={branches}
      />
    </>
  );
}

// --- Check-in ---
function CheckInModal({ open, onClose, memberId, onDone }: any) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    setLoading(true); setErr(null);
    const res = await fetch("/api/attendance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId, source: "MANUAL" }) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setErr(data.error || "Hata");
    onDone();
  };
  return (
    <Modal open={open} onClose={onClose} title="Manuel Check-in" size="sm"
      footer={<>
        <button onClick={onClose} className="btn-ghost btn-md">Vazgeç</button>
        <button onClick={submit} disabled={loading} className="btn-primary btn-md">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check-in Yap"}
        </button>
      </>}
    >
      <p className="text-sm text-dim">Bu üye için bugün manuel olarak giriş kaydı oluştur.</p>
      {err && <div className="mt-3 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{err}</div>}
    </Modal>
  );
}

// --- Measurement ---
function MeasurementModal({ open, onClose, memberId, onDone }: any) {
  const [f, setF] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async () => {
    setLoading(true); setErr(null);
    const res = await fetch("/api/measurements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId, ...f }) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setErr(data.error || "Hata");
    setF({});
    onDone();
  };
  const fields: [string, string][] = [
    ["weightKg", "Kilo (kg)"], ["bodyFatPct", "Yağ %"], ["musclePct", "Kas %"],
    ["waistCm", "Bel (cm)"], ["chestCm", "Göğüs (cm)"], ["hipCm", "Kalça (cm)"],
    ["armCm", "Kol (cm)"], ["legCm", "Bacak (cm)"],
  ];
  return (
    <Modal open={open} onClose={onClose} title="Yeni Ölçüm Ekle" size="lg"
      footer={<>
        <button onClick={onClose} className="btn-ghost btn-md">Vazgeç</button>
        <button onClick={submit} disabled={loading} className="btn-primary btn-md">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kaydet"}
        </button>
      </>}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {fields.map(([k, label]) => (
          <div key={k}>
            <label className="label-base">{label}</label>
            <input type="number" step="0.1" className="input-base" value={f[k] || ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
          </div>
        ))}
        <div className="col-span-2 md:col-span-4">
          <label className="label-base">Notlar</label>
          <textarea rows={2} className="input-base" value={f.notes || ""} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        </div>
      </div>
      {err && <div className="mt-3 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{err}</div>}
    </Modal>
  );
}

// --- Üyelik yenile ---
function RenewModal({ open, onClose, memberId, plans, onDone }: any) {
  const [planId, setPlanId] = useState("");
  const [method, setMethod] = useState("CARD");
  const [status, setStatus] = useState("PAID");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!planId) return setErr("Plan seçmelisiniz");
    setLoading(true); setErr(null);
    const res = await fetch("/api/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, planId, paymentMethod: method, paymentStatus: status, paymentAmount: amount || undefined }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setErr(data.error || "Hata");
    onDone();
  };

  return (
    <Modal open={open} onClose={onClose} title="Üyeliği Yenile / Yeni Üyelik" size="md"
      footer={<>
        <button onClick={onClose} className="btn-ghost btn-md">Vazgeç</button>
        <button onClick={submit} disabled={loading} className="btn-primary btn-md">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Üyeliği Oluştur"}
        </button>
      </>}
    >
      <div className="space-y-4">
        <div>
          <label className="label-base">Plan</label>
          <select className="input-base" value={planId} onChange={(e) => {
            setPlanId(e.target.value);
            const p = plans.find((x: any) => x.id === e.target.value);
            if (p) setAmount(String(p.price));
          }}>
            <option value="">Plan seç</option>
            {plans.map((p: any) => <option key={p.id} value={p.id}>{p.name} — ₺{Number(p.price).toLocaleString("tr-TR")} ({p.durationDays} gün)</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label-base">Tutar</label>
            <input type="number" className="input-base" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="label-base">Yöntem</label>
            <select className="input-base" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CARD">Kart</option><option value="CASH">Nakit</option>
              <option value="TRANSFER">Havale</option><option value="IYZICO">iyzico</option><option value="PAYTR">PayTR</option>
            </select>
          </div>
          <div>
            <label className="label-base">Durum</label>
            <select className="input-base" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="PAID">Ödendi</option><option value="PENDING">Beklemede</option>
            </select>
          </div>
        </div>
        <div className="text-xs text-muted bg-subtle rounded-lg p-3">
          Mevcut aktif üyelikler pasifleştirilir, yeni üyelik bugünden itibaren plan süresince geçerli olur. Üye otomatik <span className="text-emerald-300">AKTİF</span> duruma geçer.
        </div>
        {err && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{err}</div>}
      </div>
    </Modal>
  );
}

// --- Ödeme Al (plan seçimli) ---
function PaymentModal({ open, onClose, memberId, plans, onDone }: any) {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CARD");
  const [status, setStatus] = useState("PAID");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function selectPlan(p: Plan) {
    setSelectedPlan(p);
    setAmount(String(Number(p.price)));
    setErr(null);
  }

  function reset() {
    setSelectedPlan(null);
    setAmount("");
    setMethod("CARD");
    setStatus("PAID");
    setNotes("");
    setErr(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const submit = async () => {
    if (!selectedPlan) return setErr("Lütfen bir paket seçin");
    if (!amount) return setErr("Tutar zorunlu");
    setLoading(true); setErr(null);
    const res = await fetch("/api/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId,
        planId: selectedPlan.id,
        paymentAmount: amount,
        paymentMethod: method,
        paymentStatus: status,
        paymentNotes: notes || undefined,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setErr(data.error || "Hata");
    reset();
    onDone();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Ödeme Al" size="lg"
      footer={<>
        <button onClick={handleClose} className="btn-ghost btn-md">Vazgeç</button>
        <button onClick={submit} disabled={loading || !selectedPlan} className="btn-primary btn-md">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ödemeyi Kaydet & Üyeliği Oluştur"}
        </button>
      </>}
    >
      <div className="space-y-5">
        {/* Plan kartları */}
        <div>
          <label className="label-base mb-2 block">Paket Seç</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {plans.map((p: Plan) => {
              const isSelected = selectedPlan?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPlan(p)}
                  className={`text-left rounded-xl border p-4 transition-all ${
                    isSelected
                      ? "border-neon bg-neon/5 ring-1 ring-neon/30"
                      : "border-subtle bg-subtle hover:border-subtle-md hover:bg-subtle-md"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{p.name}</span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-neon flex-shrink-0 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-ink-950" fill="currentColor" viewBox="0 0 12 12">
                          <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-neon">₺{Number(p.price).toLocaleString("tr-TR")}</span>
                    <span className="text-xs text-muted">/ {p.durationDays} gün</span>
                  </div>
                </button>
              );
            })}
          </div>
          {plans.length === 0 && (
            <p className="text-sm text-muted py-3">Henüz hiç paket tanımlı değil.</p>
          )}
        </div>

        {/* Diğer alanlar */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label-base">Tutar (₺)</label>
            <input type="number" className="input-base" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Otomatik" />
          </div>
          <div>
            <label className="label-base">Yöntem</label>
            <select className="input-base" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CARD">Kart</option>
              <option value="CASH">Nakit</option>
              <option value="TRANSFER">Havale</option>
              <option value="IYZICO">iyzico</option>
              <option value="PAYTR">PayTR</option>
            </select>
          </div>
          <div>
            <label className="label-base">Durum</label>
            <select className="input-base" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="PAID">Ödendi</option>
              <option value="PENDING">Beklemede</option>
              <option value="REFUNDED">İade</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label-base">Açıklama</label>
          <input className="input-base" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ek not..." />
        </div>

        {selectedPlan && (
          <div className="text-xs text-muted bg-subtle rounded-lg p-3">
            Mevcut aktif üyelikler pasifleştirilir. <strong className="text-primary">{selectedPlan.name}</strong> paketi bugünden itibaren {selectedPlan.durationDays} gün geçerli olur. Üye otomatik <span className="text-emerald-300">AKTİF</span> duruma geçer.
          </div>
        )}

        {err && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{err}</div>}
      </div>
    </Modal>
  );
}

// --- QR Card ---
function QRModal({ open, onClose, member, memberId }: any) {
  // QR placeholder; production'da `qrcode` paketi ile gerçek SVG üretilir
  return (
    <Modal open={open} onClose={onClose} title="Üye QR Kartı" size="sm">
      <div className="flex flex-col items-center text-center">
        <div className="w-56 h-56 rounded-2xl bg-white grid place-items-center">
          <div className="grid grid-cols-12 gap-px w-44 h-44">
            {Array.from({ length: 144 }).map((_, i) => (
              <div key={i} className={Math.random() > 0.5 ? "bg-ink-950" : "bg-white"} />
            ))}
          </div>
        </div>
        <div className="mt-4 font-semibold">{member?.name}</div>
        <div className="text-sm text-body">Üye No: {memberId.slice(0, 10)}</div>
        <button className="mt-4 btn-secondary btn-md" onClick={() => window.print()}>Yazdır</button>
      </div>
    </Modal>
  );
}
