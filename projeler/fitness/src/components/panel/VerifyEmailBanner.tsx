"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

export function VerifyEmailBanner() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function resend() {
    setLoading(true); setMsg(null);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg("Doğrulama e-postası gönderildi.");
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Gönderilemedi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2 text-sm text-amber-300">
        <Mail className="w-4 h-4 shrink-0" />
        E-posta adresini doğrulamadın. Ödeme yapabilmek için önce e-postanı doğrulaman gerekiyor.
      </div>
      <div className="flex items-center gap-3">
        {msg && <span className="text-xs text-amber-200">{msg}</span>}
        <button onClick={resend} disabled={loading} className="btn-secondary btn-sm shrink-0">
          {loading ? "Gönderiliyor…" : "Yeniden Gönder"}
        </button>
      </div>
    </div>
  );
}
