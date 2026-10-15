"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 grid place-items-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">Bir hata oluştu</h1>
        <p className="mt-2 text-body text-sm">
          Sunucu geçici olarak yanıt veremiyor. Lütfen sayfayı yenileyin.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <button onClick={reset} className="btn-primary btn-md">
            <RefreshCw className="w-4 h-4" />
            Tekrar Dene
          </button>
          <Link href="/" className="btn-secondary btn-md">Ana Sayfa</Link>
        </div>
      </div>
    </div>
  );
}
