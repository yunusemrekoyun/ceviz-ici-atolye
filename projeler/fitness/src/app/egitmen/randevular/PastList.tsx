"use client";

import { useState } from "react";
import { CheckCircle2, UserX, X, Loader2 } from "lucide-react";

type Appt = {
  id: string;
  startAt: string;
  status: string;
  memberName: string;
  notes: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Planlandı", COMPLETED: "Tamamlandı",
  CANCELLED: "İptal", NO_SHOW: "Gelmedi",
};
const STATUS_CLASS: Record<string, string> = {
  SCHEDULED: "badge-info", COMPLETED: "badge-success",
  CANCELLED: "badge-danger", NO_SHOW: "badge-warn",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    weekday: "short", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit",
  });
}

export function PastList({ appointments }: { appointments: Appt[] }) {
  const [list, setList] = useState(appointments);
  const [modal, setModal] = useState<{ appt: Appt; status: "COMPLETED" | "NO_SHOW" } | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openModal(appt: Appt, status: "COMPLETED" | "NO_SHOW") {
    setModal({ appt, status });
    setNote("");
    setError("");
  }

  async function confirm() {
    if (!modal) return;
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/trainer/appointments/${modal.appt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: modal.status, notes: note }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Kaydedilemedi"); return; }
      setList((prev) =>
        prev.map((a) => (a.id === modal.appt.id ? { ...a, status: modal.status, notes: note.trim() || a.notes } : a))
      );
      setModal(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card-surface p-6">
      <h2 className="font-semibold mb-4 text-muted">Geçmiş Randevular</h2>
      {list.length === 0 ? (
        <div className="text-center py-10 text-muted text-sm">Geçmiş randevu yok.</div>
      ) : (
        <div className="divide-y divide-subtle">
          {list.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{a.memberName}</div>
                <div className="text-xs text-muted">{fmt(a.startAt)}</div>
                {a.notes && a.status !== "SCHEDULED" && (
                  <div className="text-xs text-faint mt-0.5 italic truncate max-w-md">{a.notes}</div>
                )}
              </div>
              {a.status === "SCHEDULED" ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openModal(a, "COMPLETED")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/10 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Tamamlandı
                  </button>
                  <button
                    onClick={() => openModal(a, "NO_SHOW")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-amber-400 border border-amber-400/20 hover:bg-amber-400/10 transition-colors"
                  >
                    <UserX className="w-3.5 h-3.5" /> Gelmedi
                  </button>
                </div>
              ) : (
                <span className={`badge ${STATUS_CLASS[a.status]}`}>{STATUS_LABEL[a.status]}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card-surface rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-base">
                  {modal.status === "COMPLETED" ? "Seansı Tamamla" : "Gelmedi Olarak İşaretle"}
                </h2>
                <p className="text-sm text-muted mt-0.5">
                  {modal.appt.memberName} · {fmt(modal.appt.startAt)}
                </p>
              </div>
              <button
                onClick={() => setModal(null)}
                className="p-1 rounded-lg hover:bg-subtle text-muted hover:text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={modal.status === "COMPLETED"
                ? "Seans notu (isteğe bağlı) — örn: omuz hassastı, bench hafif tutuldu"
                : "Not (isteğe bağlı)"}
              className="input-base w-full resize-none rounded-xl px-3 py-2 text-sm"
            />
            <p className="text-xs text-faint">Notu üye detay sayfasında sen görürsün; bir sonraki seansta hatırlatır.</p>

            {error && <p className="text-sm text-rose-400">{error}</p>}

            <button onClick={confirm} disabled={saving} className="btn-primary btn-md w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Kaydet"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
