"use client";

import { useState } from "react";
import { Ban, X } from "lucide-react";

interface Props {
  appointmentId: string;
  memberName: string;
  dateLabel: string;
  onCancelled: (id: string) => void;
}

export function CancelBtn({ appointmentId, memberName, dateLabel, onCancelled }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/trainer/appointments/${appointmentId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Hata oluştu"); return; }
      onCancelled(appointmentId);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setReason(""); setError(""); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-400/20 hover:bg-red-400/10 transition-colors shrink-0"
      >
        <Ban className="w-3.5 h-3.5" />
        İptal Et
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card-surface rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-base">Randevuyu İptal Et</h2>
                <p className="text-sm text-muted mt-0.5">{memberName} · {dateLabel}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-subtle text-muted hover:text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs text-muted mb-1.5">
                İptal sebebi <span className="text-faint">(isteğe bağlı)</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Örn: Hastalık, acil durum..."
                className="input-base w-full resize-none rounded-xl px-3 py-2 text-sm"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-subtle text-sm text-muted hover:text-primary transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                {loading ? "İptal ediliyor..." : "İptal Et"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
