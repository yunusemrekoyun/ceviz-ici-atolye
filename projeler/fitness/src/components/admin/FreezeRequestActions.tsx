"use client";

import { useState } from "react";
import { Check, X, Loader2, Snowflake } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";

interface FreezeRow {
  id: string;
  days: number;
  reason: string | null;
  requestedAt: string;
  planName: string;
}

export function FreezeRequestActions({ requests }: { requests: FreezeRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function decide(id: string, action: "approve" | "reject") {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/freeze/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ type: "error", message: data.error || "İşlem başarısız." }); return; }
      toast({ type: "success", message: action === "approve" ? "Talep onaylandı, üyelik uzatıldı." : "Talep reddedildi." });
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  if (requests.length === 0) return null;

  return (
    <div className="card-surface p-6 border-sky-500/20">
      <div className="font-semibold flex items-center gap-2 mb-3">
        <Snowflake className="w-4 h-4 text-sky-300" /> Bekleyen Dondurma Talepleri
      </div>
      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-subtle">
            <div className="min-w-0">
              <div className="text-sm font-medium">{r.planName} · {r.days} gün</div>
              <div className="text-xs text-muted mt-0.5">
                {new Date(r.requestedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}
                {r.reason && ` — ${r.reason}`}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => decide(r.id, "approve")}
                disabled={loadingId === r.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/10 disabled:opacity-50 transition-colors"
              >
                {loadingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Onayla
              </button>
              <button
                onClick={() => decide(r.id, "reject")}
                disabled={loadingId === r.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-rose-400 border border-rose-400/20 hover:bg-rose-400/10 disabled:opacity-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Reddet
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
