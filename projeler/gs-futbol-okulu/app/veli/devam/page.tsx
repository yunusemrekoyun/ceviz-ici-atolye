import { DateRangeFilter } from "@/components/DateRangeFilter";
import { inDateRange, resolveDateRange, withDateRange } from "@/lib/date-range";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { todayKey } from "@/lib/billing";
import { dayLabel } from "@/lib/billing-shared";
import { attendanceBadges } from "@/lib/badges";
import { studentAttendance, summarize } from "@/lib/attendance";
import { loadGuardian, SIMPLE_PANEL } from "@/lib/guardian-view";
import { WEEKDAYS, weekdayOf } from "@/lib/program";
import { ChildTabs, NoChildren } from "@/components/guardian/ChildTabs";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Devam" };

const LABEL = { present: "Geldi", absent: "Gelmedi", excused: "İzinli" } as Record<string, string>;

export default async function GuardianAttendance({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const today = todayKey();
  const range = resolveDateRange(params, today);
  // Sade panel (VEL-17): bu sayfa şimdilik kapalı
  if (SIMPLE_PANEL) {
    const o = params.ogrenci;
    redirect(withDateRange(typeof o === "string" ? `/veli/antrenmanlar?ogrenci=${encodeURIComponent(o)}` : "/veli/antrenmanlar", range));
  }
  const { children, child } = await loadGuardian(params.ogrenci, { requireAccess: true });
  if (!child) return <NoChildren />;
  const records = studentAttendance(child.id, -1).filter(r => inDateRange(r.date, range));
  const sum = summarize(records);
  const badges = attendanceBadges(records, todayKey());
  return (
    <div className="grid gap-4">
      <ChildTabs kids={children} selectedId={child.id} base={withDateRange("/veli/devam", range)} />
      <h1 className="text-2xl font-black text-ink">Devam · {child.studentFullName.split(" ")[0]}</h1>
      <DateRangeFilter range={range} today={today} />
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-emerald-50 p-3">
          <p className="text-3xl font-black text-emerald-800">{sum.present}</p>
          <p className="font-semibold text-emerald-800">Geldi</p>
        </div>
        <div className="rounded-2xl bg-red-50 p-3">
          <p className="text-3xl font-black text-red-800">{sum.absent}</p>
          <p className="font-semibold text-red-800">Gelmedi</p>
        </div>
        <div className="rounded-2xl bg-white p-3">
          <p className="text-3xl font-black text-ink">{sum.rate !== null ? `%${sum.rate}` : "—"}</p>
          <p className="font-semibold text-muted">Devam</p>
        </div>
      </div>
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Rozetler</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {badges.map((b) => (
            <li key={b.key} className={["rounded-2xl p-3", b.earned ? "bg-gs-yellow-soft" : "bg-surface opacity-60"].join(" ")}>
              <p className="text-2xl" aria-hidden="true">
                {b.earned ? "★" : "☆"}
              </p>
              <p className="font-bold text-ink">{b.title}</p>
              <p className="text-sm text-muted">{b.text}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Geçmiş</h2>
        {records.length === 0 ? <p className="mt-2 text-muted">Henüz yoklama kaydı yok.</p> : null}
        <ul className="mt-2 divide-y divide-line">
          {records.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2.5 text-[17px]">
              <span className="text-ink">
                {dayLabel(r.date, false)} {WEEKDAYS[weekdayOf(r.date) - 1]} · {r.startTime}
              </span>
              <span className={["rounded-lg px-2.5 py-0.5 font-bold", r.status === "present" ? "bg-emerald-100 text-emerald-800" : r.status === "absent" ? "bg-red-100 text-red-800" : "bg-sky-100 text-sky-800"].join(" ")}>{LABEL[r.status] ?? r.status}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
