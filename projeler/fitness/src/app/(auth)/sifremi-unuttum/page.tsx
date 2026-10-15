"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bir hata oluştu");
      setSent(true);
      if (data.devToken) setDevToken(data.devToken);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-neon/15 grid place-items-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-neon" />
        </div>
        <h1 className="h-display text-2xl mt-6">Kontrol et</h1>
        <p className="mt-3 text-sm text-body">
          Eğer bu e-posta sistemde kayıtlıysa, şifre sıfırlama bağlantısı gönderildi.
          Gelen kutunu ve spam klasörünü kontrol et.
        </p>
        {devToken && (
          <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 text-left">
            <div className="font-semibold mb-1">Dev modu — token:</div>
            <Link href={`/sifre-sifirla?token=${devToken}`} className="break-all text-neon hover:underline">
              /sifre-sifirla?token={devToken.slice(0, 20)}…
            </Link>
          </div>
        )}
        <Link href="/giris" className="mt-6 inline-flex items-center gap-2 text-sm text-neon hover:underline">
          <ArrowLeft className="w-4 h-4" /> Girişe dön
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/giris" className="inline-flex items-center gap-2 text-sm text-body hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> Girişe dön
      </Link>
      <h1 className="h-display text-3xl">Şifreni mi unuttun?</h1>
      <p className="mt-2 text-sm text-body">
        Kayıtlı e-postanı gir, sıfırlama bağlantısı gönderelim.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="label-base">E-posta</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base pl-10"
              placeholder="ornek@email.com"
            />
          </div>
        </div>

        {err && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{err}</div>}

        <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sıfırlama Bağlantısı Gönder"}
        </button>
      </form>
    </div>
  );
}
