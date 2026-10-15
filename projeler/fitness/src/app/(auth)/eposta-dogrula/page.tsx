"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errMsg, setErrMsg] = useState("Doğrulama başarısız");

  useEffect(() => {
    if (!token) { setStatus("error"); setErrMsg("Token bulunamadı"); return; }
    fetch(`/api/auth/verify-email?token=${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setStatus("success");
        else { setStatus("error"); setErrMsg(d.error || "Doğrulama başarısız"); }
      })
      .catch(() => { setStatus("error"); });
  }, [token]);

  if (status === "loading") {
    return (
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-neon animate-spin mx-auto" />
        <p className="mt-4 text-body">Doğrulanıyor…</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-neon/15 grid place-items-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-neon" />
        </div>
        <h1 className="h-display text-2xl mt-6">E-posta doğrulandı!</h1>
        <p className="mt-3 text-sm text-body">Hesabın aktif. Artık giriş yapabilirsin.</p>
        <Link href="/panel" className="mt-6 btn-primary btn-md inline-flex">Panele Git</Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/15 grid place-items-center mx-auto">
        <AlertCircle className="w-8 h-8 text-rose-400" />
      </div>
      <h1 className="h-display text-2xl mt-6">Doğrulama başarısız</h1>
      <p className="mt-3 text-sm text-body">{errMsg}</p>
      <Link href="/giris" className="mt-6 inline-block text-sm text-neon hover:underline">Girişe dön</Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-center"><Loader2 className="w-10 h-10 text-neon animate-spin mx-auto" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
