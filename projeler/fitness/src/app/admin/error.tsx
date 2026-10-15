"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminError({
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
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 grid place-items-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-amber-400" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Sayfa yüklenemedi</h2>
        <p className="mt-1.5 text-sm text-label">
          Veritabanı bağlantısı zaman aşımına uğramış olabilir.
        </p>
        <button onClick={reset} className="mt-5 btn-primary btn-sm">
          <RefreshCw className="w-3.5 h-3.5" />
          Tekrar Dene
        </button>
      </div>
    </div>
  );
}
