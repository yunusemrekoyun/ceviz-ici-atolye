"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AuthError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-2xl bg-rose-500/15 grid place-items-center mx-auto mb-5">
        <AlertTriangle className="w-7 h-7 text-rose-400" />
      </div>
      <h2 className="text-lg font-semibold mb-2">Bir sorun oluştu</h2>
      <p className="text-sm text-body mb-6">Sayfa yüklenirken hata oluştu.</p>
      <button onClick={reset} className="btn-primary btn-sm">
        <RefreshCw className="w-4 h-4" />
        Tekrar Dene
      </button>
    </div>
  );
}
