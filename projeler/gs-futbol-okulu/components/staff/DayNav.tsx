import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dayLabel } from "@/lib/billing-shared";
import { addDaysTo } from "@/lib/dates";

/** Gün değiştirici: ‹ dün · bugün · yarın › */
export function DayNav({ day, today, base }: { day: string; today: string; base: string }) {
  const href = (d: string) => (d === today ? base : `${base}${base.includes("?") ? "&" : "?"}gun=${d}`);
  const cls = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:border-gray-400 active:scale-[0.97]";
  return (
    <div className="flex items-center gap-2">
      <Link href={href(addDaysTo(day, -1))} className={cls} aria-label="Önceki gün">
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </Link>
      <span className="min-w-36 flex-1 text-center font-bold text-ink">{day === today ? "Bugün" : dayLabel(day)}</span>
      <Link href={href(addDaysTo(day, 1))} className={cls} aria-label="Sonraki gün">
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </Link>
      {day !== today ? (
        <Link href={base} className={cls}>
          Bugün
        </Link>
      ) : null}
    </div>
  );
}
