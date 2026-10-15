"use client";

import { useState } from "react";
import { Snowflake, Sun, CalendarPlus } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { useRouter } from "next/navigation";

interface Props {
  membershipId: string;
  isActive: boolean;
  isFrozen: boolean;
}

export function MembershipActions({ membershipId, isActive, isFrozen }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [days, setDays] = useState("30");

  async function action(act: string, extra?: Record<string, any>) {
    setLoading(act);
    try {
      const res = await fetch(`/api/memberships/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: act, ...extra }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Hata");
      toast({ type: "success", message: act === "freeze" ? "Üyelik donduruldu." : act === "unfreeze" ? "Üyelik aktifleştirildi." : `Üyelik ${days} gün uzatıldı.` });
      router.refresh();
    } catch (e: any) {
      toast({ type: "error", message: e.message || "İşlem başarısız." });
    } finally {
      setLoading(null);
      setExtendOpen(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {isActive && !isFrozen && (
        <button
          onClick={() => action("freeze")}
          disabled={!!loading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 transition-colors disabled:opacity-50"
        >
          <Snowflake className="w-3 h-3" />
          {loading === "freeze" ? "…" : "Dondur"}
        </button>
      )}
      {isFrozen && (
        <button
          onClick={() => action("unfreeze")}
          disabled={!!loading}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-colors disabled:opacity-50"
        >
          <Sun className="w-3 h-3" />
          {loading === "unfreeze" ? "…" : "Aktifleştir"}
        </button>
      )}
      {isActive && (
        <>
          <button
            onClick={() => setExtendOpen(!extendOpen)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 transition-colors"
          >
            <CalendarPlus className="w-3 h-3" /> Uzat
          </button>
          {extendOpen && (
            <div className="flex items-center gap-2 ml-1">
              <input
                type="number" min={1} max={365} value={days}
                onChange={(e) => setDays(e.target.value)}
                className="w-16 text-xs text-center bg-subtle border border-subtle-md rounded-lg px-2 py-1"
              />
              <span className="text-xs text-muted">gün</span>
              <button
                onClick={() => action("extend", { extendDays: parseInt(days) })}
                disabled={!!loading}
                className="text-xs px-2.5 py-1 rounded-lg bg-neon text-ink-950 font-medium hover:bg-neon/80 transition-colors disabled:opacity-50"
              >
                {loading === "extend" ? "…" : "Uygula"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
