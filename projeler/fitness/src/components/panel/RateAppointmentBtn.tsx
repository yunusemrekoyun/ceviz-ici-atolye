"use client";

import { useState } from "react";
import { Star, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  appointmentId: string;
  trainerName: string;
}

export function RateAppointmentBtn({ appointmentId, trainerName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (stars === 0) { setError("Bir puan seç"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/panel/appointments/${appointmentId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: stars, comment }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Kaydedilemedi"); return; }
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setStars(0); setComment(""); setError(""); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-amber-300 border border-amber-400/20 hover:bg-amber-400/10 transition-colors shrink-0"
      >
        <Star className="w-3.5 h-3.5" /> Puanla
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card-surface rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-base">Seansı Puanla</h2>
                <p className="text-sm text-muted mt-0.5">{trainerName} ile antrenmanın nasıldı?</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-subtle text-muted hover:text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setStars(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      n <= (hover || stars) ? "text-amber-400 fill-amber-400" : "text-subtle-md"
                    }`}
                  />
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Yorumun (isteğe bağlı)"
              className="input-base w-full resize-none rounded-xl px-3 py-2 text-sm"
            />

            {error && <p className="text-sm text-rose-400">{error}</p>}

            <button
              onClick={submit}
              disabled={loading}
              className="btn-primary btn-md w-full"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Gönder"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
