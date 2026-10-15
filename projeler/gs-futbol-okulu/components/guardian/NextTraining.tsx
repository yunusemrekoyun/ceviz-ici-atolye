import { CalendarDays, MapPin } from "lucide-react";
import { dayLabel } from "@/lib/billing-shared";
import type { ChildSummary } from "@/lib/guardian-summary";
import { directionLinks } from "@/lib/maps";
import { WEEKDAYS, weekdayOf } from "@/lib/program";

export function NextTraining({ next, today }: { next: ChildSummary["next"]; today: string }) {
  if (!next) return null;
  return (
    <section className="veli-next" aria-label="Sıradaki antrenman">
      <h2 className="veli-next-heading"><CalendarDays size={18} aria-hidden="true" />Sıradaki antrenman</h2>
      <strong>{next.date === today ? "Bugün" : `${dayLabel(next.date, false)} ${WEEKDAYS[weekdayOf(next.date) - 1]}`} · {next.startTime}</strong>
      {next.venue ? (
        <a href={directionLinks(next.venue)[0]!.href} target="_blank" rel="noopener noreferrer"><MapPin size={16} aria-hidden="true" />{next.venueName} · yol tarifi</a>
      ) : next.venueName ? <p className="veli-label">{next.venueName}</p> : null}
    </section>
  );
}
