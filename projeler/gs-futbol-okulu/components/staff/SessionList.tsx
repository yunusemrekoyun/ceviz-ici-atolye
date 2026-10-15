import Link from "next/link";
import type { SessionView } from "@/lib/program";

/** Günün seansları: saat, grup, saha, yoklama özeti. */
export function SessionList({ sessions, hrefFor, counts }: { sessions: SessionView[]; hrefFor: (s: SessionView) => string; counts?: Map<number, { present: number; absent: number; excused: number }> }) {
  if (sessions.length === 0) return <p className="py-8 text-center text-muted">Bu gün antrenman yok.</p>;
  return (
    <ul className="grid gap-2">
      {sessions.map((s) => {
        const c = counts?.get(s.id);
        const cancelled = s.status === "cancelled";
        const inner = (
          <>
            <span className="w-24 shrink-0 text-lg font-bold tabular-nums text-ink">{s.startTime}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">{s.groupName}</span>
              <span className="block text-sm text-muted">
                {s.venueName ?? "Saha yok"} · {s.startTime}–{s.endTime}
              </span>
            </span>
            {cancelled ? (
              <span className="rounded-md bg-gray-200 px-2 py-0.5 text-xs font-bold text-gray-700">İptal</span>
            ) : c && (c.present || c.absent) ? (
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">{c.present} geldi</span>
            ) : c?.excused ? (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">{c.excused} izinli</span>
            ) : (
              <span className="text-gs-red" aria-hidden="true">
                →
              </span>
            )}
          </>
        );
        return (
          <li key={s.id}>
            {cancelled ? (
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-white p-4 opacity-70">{inner}</div>
            ) : (
              <Link href={hrefFor(s)} className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm transition hover:border-gs-red hover:shadow-md">
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
