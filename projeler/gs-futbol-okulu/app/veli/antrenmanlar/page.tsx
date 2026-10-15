import { DateRangeFilter } from "@/components/DateRangeFilter";
import { dateRangeLabel, inDateRange, resolveDateRange, withDateRange } from "@/lib/date-range";
import type { Metadata } from "next";
import { Check, Minus, X } from "lucide-react";
import { todayKey } from "@/lib/billing";
import { dayLabel } from "@/lib/billing-shared";
import { GUARDIAN_SOURCE, studentAttendance, summarize } from "@/lib/attendance";
import { childSummary } from "@/lib/guardian-summary";
import { childInfoState, loadGuardian } from "@/lib/guardian-view";
import { WEEKDAYS, weekdayOf } from "@/lib/program";
import { ChildTabs, NoChildren } from "@/components/guardian/ChildTabs";
import { MissingInfo } from "@/components/guardian/MissingInfo";
import { NextTraining } from "@/components/guardian/NextTraining";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Antrenman takibi" };

const STATUS = {
  present: { label: "Geldi", cls: "bg-emerald-50 text-emerald-800", Icon: Check },
  absent: { label: "Gelmedi", cls: "bg-[#fdf3f6] text-[#941d3b]", Icon: X },
  excused: { label: "İzinli", cls: "bg-sky-50 text-sky-800", Icon: Minus },
};

export default async function GuardianTrainings({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const { children, child } = await loadGuardian(params.ogrenci);
  if (!child) return <NoChildren />;
  const today = todayKey();
  const range = resolveDateRange(params, today);
  const records = studentAttendance(child.id, -1).filter(r => inDateRange(r.date, range));
  const sum = summarize(records);
  const next = childSummary(child, today).next;

  return (
    <div>
      <ChildTabs kids={children} selectedId={child.id} base={withDateRange("/veli/antrenmanlar", range)} />
      <MissingInfo {...childInfoState(child)} />
      <header className="veli-page-heading"><div><h1 className="veli-title">Antrenman takibi</h1><p>{child.studentFullName} · geçmiş yoklamalar</p></div></header>
      <DateRangeFilter range={range} today={today} />
      <div className="veli-training-layout">
        <aside aria-label="Devam özeti">
          <div className="veli-training-summary">
            <Stat value={sum.present} label="Geldi" />
            <Stat value={sum.absent} label="Gelmedi" />
            <Stat value={sum.rate !== null ? `%${sum.rate}` : "—"} label="Devam" />
          </div>
          <NextTraining next={next} today={today} />
        </aside>
        <div>
          {records.length === 0 ? (
            <div className="veli-empty"><h2 className="veli-title">Bu aralıkta yoklama yok</h2><p>Başka bir tarih aralığı seçebilirsiniz.</p></div>
          ) : (
            <section className="veli-month" aria-label="Seçilen tarih aralığının yoklamaları">
              <header className="veli-month-heading">
                <h2 className="veli-title">{dateRangeLabel(range)}</h2>
                <span>{sum.present} / {sum.present + sum.absent} antrenmana katıldı</span>
              </header>
              <ul>
                {records.map((r) => {
                  const st = STATUS[r.status as keyof typeof STATUS] ?? { label: r.status, cls: "bg-stone-50 text-stone-700", Icon: Minus };
                  return <li key={r.id} className="veli-training-row"><span>{dayLabel(r.date, false)} {WEEKDAYS[weekdayOf(r.date) - 1]}<small>{r.startTime}{r.source === GUARDIAN_SOURCE ? " · siz bildirdiniz" : ""}</small></span><span className={`veli-training-status ${st.cls}`}><st.Icon size={14} aria-hidden="true" />{st.label}</span></li>;
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
function Stat({ value, label }: { value: number | string; label: string }) { return <div className="veli-training-stat"><span>{label}</span><strong>{value}</strong></div>; }
