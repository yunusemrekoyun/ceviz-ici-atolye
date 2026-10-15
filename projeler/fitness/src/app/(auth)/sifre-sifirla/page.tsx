"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { Lock, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h1 className="h-display text-2xl mt-4">Geçersiz bağlantı</h1>
        <p className="mt-2 text-sm text-body">Sıfırlama bağlantısı eksik veya bozuk.</p>
        <Link href="/sifremi-unuttum" className="mt-4 inline-block text-sm text-neon hover:underline">Yeni bağlantı iste</Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setErr("Şifreler eşleşmiyor"); return; }
    if (password.length < 6) { setErr("Şifre en az 6 karakter olmalı"); return; }
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bir hata oluştu");
      setDone(true);
      setTimeout(() => router.push("/giris"), 2500);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-neon/15 grid place-items-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-neon" />
        </div>
        <h1 className="h-display text-2xl mt-6">Şifre güncellendi</h1>
        <p className="mt-3 text-sm text-body">Yeni şifrenle giriş yapabilirsin. Giriş sayfasına yönlendiriliyorsun…</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="h-display text-3xl">Yeni şifre belirle</h1>
      <p className="mt-2 text-sm text-body">En az 6 karakter kullan.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="label-base">Yeni Şifre</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <input
              type="password" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-base pl-10"
              placeholder="••••••••"
            />
          </div>
        </div>
        <div>
          <label className="label-base">Yeni Şifre (tekrar)</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <input
              type="password" required minLength={6} value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input-base pl-10"
              placeholder="••••••••"
            />
          </div>
        </div>

        {err && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{err}</div>}

        <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Şifremi Güncelle"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-subtle" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
