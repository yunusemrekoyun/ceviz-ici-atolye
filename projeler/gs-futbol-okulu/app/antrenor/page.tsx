import type { Metadata } from "next";
import Link from "next/link";
import { requirePortal } from "@/lib/auth/server";
import { currentSession, sessionCounts } from "@/lib/attendance";
import { todayKey } from "@/lib/billing";
import { dayLabel } from "@/lib/billing-shared";
import { addDaysTo } from "@/lib/dates";
import { directionLinks } from "@/lib/maps";
import { ensureSessionsWindow, listSessions, WEEKDAYS, weekdayOf } from "@/lib/program";
import { groupScope } from "@/lib/scan";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Antrenör" };

export default async function CoachHome() {
  const user = await requirePortal("coach");
  ensureSessionsWindow();
  const today = todayKey();
  const scope = groupScope(user);
  const sessions = listSessions({ from: today, to: addDaysTo(today, 7), groupIds: scope, includeCancelled: true });
  const todays = sessions.filter((s) => s.date === today);
  const now = currentSession(todays);
  const counts = sessionCounts(todays.map((s) => s.id));
  const upcoming = sessions.filter((s) => s.date > today);
  return (
    <div className="grid gap-5">
      {scope && scope.length === 0 ? <p className="rounded-2xl bg-amber-50 p-4 text-amber-900">Size henüz grup atanmadı. Yöneticiden grup atamasını isteyin.</p> : null}
      {now ? (
        <Link href={`/antrenor/seans/${now.id}`} className="block rounded-3xl bg-gs-red p-5 text-white shadow-lg transition active:scale-[0.99]">
          <p className="text-xs font-bold uppercase tracking-widest text-white/80">Şu an</p>
          <p className="mt-1 text-2xl font-black">{now.groupName}</p>
          <p className="text-white/90">
            {now.startTime}–{now.endTime} · {now.venueName ?? "Saha yok"}
          </p>
          <p className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-white px-4 font-bold text-gs-red">Yoklamayı aç →</p>
        </Link>
      ) : null}
      <section>
        <h1 className="mb-2 text-lg font-bold text-ink">Bugün</h1>
        {todays.length === 0 ? <p className="rounded-2xl bg-white p-4 text-muted">Bugün antrenmanınız yok.</p> : null}
        <ul className="grid gap-2">
          {todays.map((s) => {
            const c = counts.get(s.id);
            return (
              <li key={s.id} className={["rounded-2xl border bg-white p-4 shadow-sm", s.status === "cancelled" ? "border-dashed opacity-70" : "border-line"].join(" ")}>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xl font-black text-ink">{s.startTime}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-ink">{s.groupName}</span>
                    <span className="block text-sm text-muted">{s.status === "cancelled" ? `İptal: ${s.cancelReason}` : (s.venueName ?? "Saha yok")}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    {c && (c.present || c.absent) ? <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">{c.present} geldi</span> : null}
                    {c?.excused ? <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">{c.excused} izinli</span> : null}
                  </span>
                </div>
                {s.status === "scheduled" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/antrenor/seans/${s.id}`} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-gs-red px-4 font-semibold text-white">
                      Yoklama
                    </Link>
                    {s.venue ? (
                      <a href={directionLinks(s.venue)[0]!.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-line px-4 font-semibold text-ink">
                        Yol tarifi
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 text-lg font-bold text-ink">Önümüzdeki günler</h2>
        {upcoming.length === 0 ? <p className="rounded-2xl bg-white p-4 text-muted">Planlı antrenman yok.</p> : null}
        <ul className="grid gap-2">
          {upcoming.map((s) => (
            <li key={s.id} className={["flex items-center gap-3 rounded-2xl border bg-white p-3", s.status === "cancelled" ? "border-dashed opacity-70" : "border-line"].join(" ")}>
              <span className="w-24 shrink-0 text-sm">
                <span className="block font-bold text-ink">{dayLabel(s.date, false)}</span>
                <span className="text-muted">{WEEKDAYS[weekdayOf(s.date) - 1]}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{s.groupName}</span>
                <span className="block text-sm text-muted">
                  {s.startTime}–{s.endTime} · {s.status === "cancelled" ? "İptal" : (s.venueName ?? "Saha yok")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
