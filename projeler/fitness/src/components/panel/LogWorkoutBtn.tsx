"use client";

import { useState } from "react";
import { CheckCircle2, X, Loader2, Dumbbell } from "lucide-react";
import { useRouter } from "next/navigation";

interface ExerciseItem {
  name: string;
  sets: number | null;
  reps: string | null;
}

interface Props {
  dayId: string;
  dayName: string;
  dayLabel: string | null;
  exercises: ExerciseItem[];
  loggedToday: boolean;
}

export function LogWorkoutBtn({ dayId, dayName, dayLabel, exercises, loggedToday }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [weights, setWeights] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (loggedToday) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-emerald-400 shrink-0">
        <CheckCircle2 className="w-4 h-4" /> Bugün yapıldı
      </span>
    );
  }

  function openModal(e: React.MouseEvent) {
    // details/summary toggle'ını tetiklemesin.
    e.preventDefault();
    e.stopPropagation();
    setChecked(exercises.map(() => true));
    setWeights(exercises.map(() => ""));
    setNotes("");
    setError("");
    setOpen(true);
  }

  async function submit() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/panel/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dayId,
          notes,
          entries: exercises.map((ex, i) => ({
            name: ex.name,
            done: checked[i],
            weightKg: weights[i] ? Number(weights[i]) : null,
          })),
        }),
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
      <button onClick={openModal} className="btn-primary btn-sm shrink-0">
        <Dumbbell className="w-3.5 h-3.5" /> Yaptım
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card-surface rounded-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-base">Antrenmanı Kaydet</h2>
                <p className="text-sm text-muted mt-0.5">
                  {dayName}{dayLabel ? ` · ${dayLabel}` : ""}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-subtle text-muted hover:text-primary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-faint">
              Yapmadığın hareketin işaretini kaldır; istersen kaldırdığın ağırlığı yaz.
            </p>

            <div className="space-y-2">
              {exercises.map((ex, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-subtle">
                  <input
                    type="checkbox"
                    checked={checked[i] ?? true}
                    onChange={(e) => setChecked((prev) => prev.map((c, j) => (j === i ? e.target.checked : c)))}
                    className="w-4 h-4 accent-[#C6FF3D] shrink-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${checked[i] ? "" : "line-through text-muted"}`}>{ex.name}</div>
                    {(ex.sets || ex.reps) && (
                      <div className="text-[11px] text-muted">
                        {ex.sets ? `${ex.sets} set` : ""}{ex.sets && ex.reps ? " · " : ""}{ex.reps ? `${ex.reps} tekrar` : ""}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.5"
                      placeholder="—"
                      value={weights[i] ?? ""}
                      onChange={(e) => setWeights((prev) => prev.map((w, j) => (j === i ? e.target.value : w)))}
                      disabled={!checked[i]}
                      className="input-base w-16 px-2 py-1 text-sm text-right disabled:opacity-30"
                    />
                    <span className="text-[11px] text-faint">kg</span>
                  </div>
                </div>
              ))}
            </div>

            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Not (isteğe bağlı)"
              className="input-base w-full rounded-xl px-3 py-2 text-sm"
            />

            {error && <p className="text-sm text-rose-400">{error}</p>}

            <button onClick={submit} disabled={loading} className="btn-primary btn-md w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Kaydet 💪"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
