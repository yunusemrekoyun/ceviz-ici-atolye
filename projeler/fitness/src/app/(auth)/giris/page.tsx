"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";

function GirisForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Giriş başarısız");
      const next = sp.get("next");
      const dest = next || (
        data.role === "ADMIN" || data.role === "STAFF" ? "/admin" :
        data.role === "TRAINER" ? "/egitmen" :
        "/panel"
      );
      router.push(dest);
      router.refresh();
      // loading stays true — spinner shows until navigation completes
    } catch (e: any) {
      setErr(e.message);
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="h-display text-3xl">Tekrar hoş geldin</h1>
      <p className="mt-2 text-sm text-body">
        Hesabın yok mu?{" "}
        <Link href="/kayit" className="text-neon hover:underline">Hemen oluştur</Link>
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
        <div>
          <div className="flex items-center justify-between">
            <label className="label-base">Şifre</label>
            <Link href="/sifremi-unuttum" className="text-xs text-neon hover:underline">Şifremi unuttum</Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <input
              type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-base pl-10"
              placeholder="••••••••"
            />
          </div>
        </div>

        {err && <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{err}</div>}

        <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Giriş Yap <ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>

      {process.env.NODE_ENV === "development" && (
        <div className="mt-6 text-xs text-muted text-center space-y-1">
          <div>Demo hesaplar:</div>
          <div className="text-body">admin@bahafitness.com / admin123</div>
          <div className="text-body">uye@bahafitness.com / member123</div>
        </div>
      )}
    </div>
  );
}

export default function GirisPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-subtle" />}>
      <GirisForm />
    </Suspense>
  );
}
