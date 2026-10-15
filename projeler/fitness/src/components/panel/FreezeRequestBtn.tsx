"use client";

import { useState } from "react";
import { Snowflake, X, Loader2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  remainingFreezeDays: number;
  hasPending: boolean;
}

const OPTIONS = [7, 14, 30];

export function FreezeRequestBtn({ remainingFreezeDays, hasPending }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<number>(7);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  if (hasPending) {
    return (
      <span className="btn-secondary btn-md opacity-70 cursor-default inline-flex items-center gap-1.5">
        <Snowflake className="w-4 h-4 text-sky-300" /> Dondurma talebin inceleniyor
      </span>
    );
  }

  if (remainingFreezeDays <= 0) return null;

  async function submit() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/panel/freeze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, reason }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Talep oluşturulamadı"); return; }
      setDone(true);
      setTimeout(() => { setOpen(false); router.refresh(); }, 1500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setDays(7); setReason(""); setError(""); setDone(false); }}
        className="btn-secondary btn-md"
      >
        <Snowflake className="w-4 h-4 text-sky-300" /> Dondur
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card-surface rounded-2xl w-full max-w-sm p-6 space-y-4">
            {done ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-neon mx-auto" />
                <div className="font-semibold">Talebin alındı</div>
                <p className="text-sm text-muted">Onaylandığında bildirim alacaksın.</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-bold text-base">Üyeliği Dondur</h2>
                    <p className="text-sm text-muted mt-0.5">
                      Onaylanan süre üyelik bitişine eklenir. Kalan hakkın: {remainingFreezeDays} gün.
                    </p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1 rounded-lg hover:bg-subtle text-muted hover:text-primary transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      disabled={d > remainingFreezeDays}
                      className={`py-3 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                        days === d
                          ? "bg-neon text-ink-950 border-neon"
                          : "bg-subtle border-subtle text-body hover:border-neon/40"
                      }`}
                    >
                      {d} gün
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Sebep (isteğe bağlı) — örn. tatil, sağlık"
                  className="input-base w-full resize-none rounded-xl px-3 py-2 text-sm"
                />

                {error && <p className="text-sm text-rose-400">{error}</p>}

                <button onClick={submit} disabled={loading} className="btn-primary btn-md w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Talep Gönder"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
