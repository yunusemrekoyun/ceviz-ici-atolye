"use client";

import { useState } from "react";
import {
  User, Mail, Phone, Lock, Shield, Monitor,
  CheckCircle2, AlertCircle, Loader2, Trash2,
  Ruler, Save, Pencil, X, ChevronDown, ChevronUp,
  Gift, Copy, Check,
} from "lucide-react";

interface Session {
  id: string;
  userAgent: string;
  ip: string;
  createdAt: string;
}

interface MemberInfo {
  heightCm:       number | null;
  startWeightKg:  number | null;
  targetWeightKg: number | null;
  birthDate:      string | null;
  gender:         string | null;
  goal:           string | null;
  healthNotes:    string | null;
}

interface ReferralInfo {
  code: string;
  totalReferred: number;
  rewarded: number;
}

interface Props {
  user: {
    name: string;
    email: string;
    phone: string;
    emailVerified: string | null;
    createdAt: string;
    sessions: Session[];
  };
  memberInfo: MemberInfo | null;
  referral: ReferralInfo | null;
}

const GENDER_LABEL: Record<string, string> = { MALE: "Erkek", FEMALE: "Kadın", OTHER: "Diğer" };

export function ProfileClient({ user, memberInfo, referral }: Props) {
  const [copied, setCopied] = useState(false);

  function copyReferralLink() {
    if (!referral) return;
    const link = `${window.location.origin}/kayit?ref=${referral.code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>(user.sessions);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);

  const [physEditing, setPhysEditing] = useState(false);
  const [physForm, setPhysForm] = useState({
    heightCm:       memberInfo?.heightCm       ? String(memberInfo.heightCm)       : "",
    startWeightKg:  memberInfo?.startWeightKg  ? String(memberInfo.startWeightKg)  : "",
    targetWeightKg: memberInfo?.targetWeightKg ? String(memberInfo.targetWeightKg) : "",
    birthDate:      memberInfo?.birthDate      ?? "",
    gender:         memberInfo?.gender         ?? "",
    goal:           memberInfo?.goal           ?? "",
    healthNotes:    memberInfo?.healthNotes    ?? "",
  });
  const [physLoading, setPhysLoading] = useState(false);
  const [physMsg, setPhysMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) { setPwMsg({ type: "err", text: "Şifreler eşleşmiyor" }); return; }
    if (pwForm.next.length < 6) { setPwMsg({ type: "err", text: "En az 6 karakter gerekli" }); return; }
    setPwLoading(true); setPwMsg(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPwMsg({ type: "ok", text: "Şifre güncellendi." });
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err: any) {
      setPwMsg({ type: "err", text: err.message || "Güncellenemedi." });
    } finally { setPwLoading(false); }
  }

  async function revokeSession(id: string) {
    await fetch("/api/auth/sessions", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id }),
    });
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  async function resendVerification() {
    setResendLoading(true); setResendMsg(null);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResendMsg("Doğrulama e-postası gönderildi.");
    } catch (err: any) {
      setResendMsg(err.message || "Gönderilemedi.");
    } finally { setResendLoading(false); }
  }

  async function handleSavePhysical(e: React.FormEvent) {
    e.preventDefault();
    setPhysLoading(true); setPhysMsg(null);
    try {
      const res = await fetch("/api/panel/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(physForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhysMsg({ type: "ok", text: "Bilgiler kaydedildi." });
      setPhysEditing(false);
    } catch (err: any) {
      setPhysMsg({ type: "err", text: err.message || "Kaydedilemedi." });
    } finally { setPhysLoading(false); }
  }

  const initials = user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const physComplete = physForm.heightCm && physForm.startWeightKg && physForm.birthDate && physForm.gender;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">

      {/* ── Sol sütun (lg: 2/5) ── */}
      <div className="lg:col-span-2 space-y-4">

        {/* Hesap Özeti */}
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neon to-accent-cyan grid place-items-center text-ink-950 text-xl font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{user.name}</div>
              <div className="text-sm text-body truncate">{user.email}</div>
              <div className="mt-1">
                {user.emailVerified ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />E-posta doğrulandı
                  </span>
                ) : (
                  <button onClick={resendVerification} disabled={resendLoading}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:underline">
                    {resendLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertCircle className="w-3 h-3" />}
                    Doğrulanmadı — tekrar gönder
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-subtle divide-y divide-subtle">
            {[
              { icon: User,    label: "Üye Tarihi", value: user.createdAt },
              { icon: Phone,   label: "Telefon",    value: user.phone || "—" },
              { icon: Monitor, label: "Oturum",     value: `${sessions.length} aktif` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between px-5 py-2.5">
                <span className="flex items-center gap-2 text-xs text-muted">
                  <Icon className="w-3.5 h-3.5" />{label}
                </span>
                <span className="text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>

          {resendMsg && (
            <div className="mx-4 mb-4 text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              {resendMsg}
            </div>
          )}
        </div>

        {/* Davet Et */}
        {referral && (
          <div className="card-surface rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-subtle">
              <Gift className="w-4 h-4 text-neon" />
              <span className="font-semibold text-sm">Arkadaşını Davet Et</span>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-body">
                Davet kodunla kayıt olan arkadaşın ilk ödemesini yaptığında üyeliğine <strong className="text-neon">7 gün</strong> ekleniyor.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-subtle rounded-lg px-3 py-2 truncate">{referral.code}</code>
                <button onClick={copyReferralLink} className="btn-secondary btn-sm shrink-0">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Kopyalandı" : "Linki Kopyala"}
                </button>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted">
                <span>{referral.totalReferred} kişi davet ettin</span>
                <span>{referral.rewarded} ödül kazandın</span>
              </div>
            </div>
          </div>
        )}

        {/* Aktif Oturumlar */}
        {sessions.length > 0 && (
          <div className="card-surface rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-subtle">
              <Monitor className="w-4 h-4 text-neon" />
              <span className="font-semibold text-sm">Aktif Oturumlar</span>
              <span className="text-xs text-muted ml-1">({sessions.length})</span>
            </div>
            <div className="divide-y divide-subtle">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm">{s.userAgent.split(" ").slice(0, 4).join(" ")}</div>
                    <div className="text-xs text-muted">{s.ip} · {s.createdAt}</div>
                  </div>
                  <button onClick={() => revokeSession(s.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/10 text-faint hover:text-rose-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Sağ sütun (lg: 3/5) ── */}
      <div className="lg:col-span-3 space-y-4">

        {/* Fiziksel Bilgiler */}
        {memberInfo !== null && (
          <div className="card-surface rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-subtle">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-neon" />
                <span className="font-semibold text-sm">Fiziksel Bilgiler</span>
                {!physComplete && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium">Eksik</span>
                )}
              </div>
              <button
                onClick={() => { setPhysEditing(!physEditing); setPhysMsg(null); }}
                className="flex items-center gap-1.5 text-xs text-body hover:text-white transition-colors"
              >
                {physEditing ? <><X className="w-3.5 h-3.5" />Vazgeç</> : <><Pencil className="w-3.5 h-3.5" />Düzenle</>}
              </button>
            </div>

            {!physEditing ? (
              <div className="grid grid-cols-3 gap-px bg-subtle">
                {[
                  { label: "Boy",             value: physForm.heightCm       ? `${physForm.heightCm} cm`       : null },
                  { label: "Başlangıç Kilo",  value: physForm.startWeightKg  ? `${physForm.startWeightKg} kg`  : null },
                  { label: "Hedef Kilo",      value: physForm.targetWeightKg ? `${physForm.targetWeightKg} kg` : null },
                  { label: "Doğum Tarihi",    value: physForm.birthDate      ? new Date(physForm.birthDate).toLocaleDateString("tr-TR") : null },
                  { label: "Cinsiyet",        value: physForm.gender         ? GENDER_LABEL[physForm.gender]   : null },
                  { label: "Hedef",           value: physForm.goal           || null },
                  { label: "Sağlık Notu",     value: physForm.healthNotes    || null },
                ].map((item) => (
                  <div key={item.label} className="bg-[var(--bg-card)] px-4 py-3">
                    <div className="text-xs text-muted">{item.label}</div>
                    <div className={`text-sm font-medium mt-0.5 ${item.value ? "" : "text-faint"}`}>
                      {item.value ?? "Girilmedi"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <form onSubmit={handleSavePhysical} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "heightCm",       label: "Boy (cm)",        type: "number", step: "1",   ph: "175" },
                    { key: "startWeightKg",  label: "Kilo (kg)",       type: "number", step: "0.1", ph: "70" },
                    { key: "targetWeightKg", label: "Hedef Kilo (kg)", type: "number", step: "0.1", ph: "65" },
                    { key: "birthDate",      label: "Doğum Tarihi",    type: "date",   step: "",    ph: "" },
                  ].map(({ key, label, type, step, ph }) => (
                    <div key={key}>
                      <label className="block text-xs text-body mb-1.5">{label}</label>
                      <input type={type} step={step || undefined} className="input-base" placeholder={ph}
                        value={(physForm as any)[key]}
                        onChange={(e) => setPhysForm((f) => ({ ...f, [key]: e.target.value }))} />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs text-body mb-1.5">Cinsiyet</label>
                    <select className="input-base" value={physForm.gender}
                      onChange={(e) => setPhysForm((f) => ({ ...f, gender: e.target.value }))}>
                      <option value="">Seçiniz</option>
                      <option value="MALE">Erkek</option>
                      <option value="FEMALE">Kadın</option>
                      <option value="OTHER">Diğer</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Hedef</label>
                  <input className="input-base" placeholder="Örn: 8 kg vermek, kas oranını artırmak"
                    value={physForm.goal} onChange={(e) => setPhysForm((f) => ({ ...f, goal: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Sağlık Notları</label>
                  <textarea rows={2} className="input-base" placeholder="Alerjiler, kronik rahatsızlıklar..."
                    value={physForm.healthNotes} onChange={(e) => setPhysForm((f) => ({ ...f, healthNotes: e.target.value }))} />
                </div>
                {physMsg && (
                  <div className={`text-sm rounded-xl px-3 py-2 ${physMsg.type === "ok"
                    ? "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20"
                    : "text-rose-300 bg-rose-500/10 border border-rose-500/20"}`}>
                    {physMsg.text}
                  </div>
                )}
                <button type="submit" disabled={physLoading} className="btn-primary btn-sm gap-2">
                  {physLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Kaydet
                </button>
              </form>
            )}
          </div>
        )}

        {/* Şifre Değiştir */}
        <div className="card-surface rounded-2xl overflow-hidden">
          <button
            onClick={() => setPwOpen(!pwOpen)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-subtle transition-colors"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-neon" />
              <span className="font-semibold text-sm">Şifre Değiştir</span>
            </div>
            {pwOpen ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
          </button>

          {pwOpen && (
            <form onSubmit={handleChangePassword} className="px-5 pb-5 pt-4 space-y-3 border-t border-subtle">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { key: "current" as const, label: "Mevcut Şifre" },
                  { key: "next"    as const, label: "Yeni Şifre" },
                  { key: "confirm" as const, label: "Tekrar" },
                ]).map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs text-body mb-1.5">{label}</label>
                    <input type="password" className="input-base" placeholder="••••••••"
                      value={pwForm[key]}
                      onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
                      required minLength={key !== "current" ? 6 : 1} />
                  </div>
                ))}
              </div>
              {pwMsg && (
                <div className={`text-sm rounded-xl px-3 py-2 ${pwMsg.type === "ok"
                  ? "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20"
                  : "text-rose-300 bg-rose-500/10 border border-rose-500/20"}`}>
                  {pwMsg.text}
                </div>
              )}
              <button type="submit" disabled={pwLoading} className="btn-primary btn-sm gap-2">
                {pwLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                Güncelle
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
