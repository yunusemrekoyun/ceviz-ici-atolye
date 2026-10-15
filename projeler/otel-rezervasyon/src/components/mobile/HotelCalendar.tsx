import { ChevronLeft, ChevronRight } from 'lucide-react';
import { daysInMonth, firstDayOfMonth, MONTHS_TR, MONTHS_EN } from '@/components/ui/CalendarPicker';

// Hotel-themed range calendar (design-refs/refs.pdf): warm surface, peach pill
// range, hotel typography. Controlled — range/availability state lives in the
// parent (MobileBooking). Replaces the panel-themed CalendarMonth in the mobile
// booking flow so the hotel palette stays consistent.

const sameDay = (a: Date | null, b: Date | null) =>
  !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function HotelCalendar({
  month,
  onMonthChange,
  checkIn,
  checkOut,
  hovered,
  onHover,
  onSelect,
  isDateUnavailable,
  today,
  tr,
}: {
  month: Date;
  onMonthChange: (delta: number) => void;
  checkIn: Date | null;
  checkOut: Date | null;
  hovered: Date | null;
  onHover: (d: Date | null) => void;
  onSelect: (d: Date) => void;
  isDateUnavailable: (d: Date) => boolean;
  today: Date;
  tr: boolean;
}) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const dim = daysInMonth(y, m);
  const firstDow = (firstDayOfMonth(y, m) + 6) % 7; // Monday-first column index
  const months = tr ? MONTHS_TR : MONTHS_EN;
  const weekdays = tr ? ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'] : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  // While picking the check-out, preview the range against the hovered day.
  const effectiveEnd = checkOut ?? (checkIn && hovered && hovered > checkIn ? hovered : null);

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ];

  return (
    <div className="card-hotel p-3">
      {/* Month nav */}
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => onMonthChange(-1)}
          aria-label={tr ? 'Önceki ay' : 'Previous month'}
          className="grid h-9 w-9 place-items-center rounded-lg text-hotel-text-muted transition-colors hover:bg-hotel-surface-2"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-serif text-base font-bold text-hotel-text-primary">
          {months[m]} {y}
        </span>
        <button
          type="button"
          onClick={() => onMonthChange(1)}
          aria-label={tr ? 'Sonraki ay' : 'Next month'}
          className="grid h-9 w-9 place-items-center rounded-lg text-hotel-text-muted transition-colors hover:bg-hotel-surface-2"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 text-center">
        {weekdays.map((w) => (
          <span key={w} className="py-1 font-hotel text-[11px] font-medium text-hotel-text-muted">
            {w}
          </span>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} className="h-11" />;
          const date = new Date(y, m, d);
          const unavailable = isDateUnavailable(date);
          const isStart = sameDay(date, checkIn);
          const isEnd = sameDay(date, effectiveEnd);
          const between = !!checkIn && !!effectiveEnd && date > checkIn && date < effectiveEnd;
          const endpoint = isStart || isEnd;

          return (
            <button
              key={d}
              type="button"
              disabled={unavailable}
              onClick={() => onSelect(date)}
              onMouseEnter={() => onHover(date)}
              onMouseLeave={() => onHover(null)}
              className="relative grid h-11 place-items-center disabled:cursor-not-allowed"
            >
              {/* Range band */}
              {between && <span className="absolute inset-y-1.5 inset-x-0 bg-hotel-peach/15" />}
              {isStart && effectiveEnd && <span className="absolute inset-y-1.5 left-1/2 right-0 bg-hotel-peach/15" />}
              {isEnd && checkIn && <span className="absolute inset-y-1.5 left-0 right-1/2 bg-hotel-peach/15" />}

              <span
                className={`relative z-10 grid h-9 w-9 place-items-center rounded-full font-hotel text-sm transition-colors ${
                  endpoint
                    ? 'bg-hotel-peach font-semibold text-hotel-bg'
                    : unavailable
                      ? 'text-hotel-text-muted/35 line-through'
                      : sameDay(date, today)
                        ? 'border border-hotel-peach/50 text-hotel-text-primary'
                        : 'text-hotel-text-primary'
                }`}
              >
                {d}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
