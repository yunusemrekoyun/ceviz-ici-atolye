"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { istanbulDayKey } from "@/lib/format";

/*
 * Kendi takvim bileşenlerimiz (tarayıcının yerel tarih seçicisi yerine). Günler "YYYY-MM-DD" string'leriyle,
 * saatler "HH:MM" ile çalışır; hesaplamalar UTC üzerinden yapılır, saat dilimi kayması olmaz.
 */

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const pad = (n: number) => String(n).padStart(2, "0");
const monthOf = (day: string) => day.slice(0, 7);

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export function addDays(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d + delta));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** "YYYY-MM-DD" → "23 Eylül 2026 Çarşamba" */
export function formatDayFull(day: string): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime())) return day;
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric", weekday: "long" }).format(date);
}

type MonthGridProps = {
  month: string;
  onMonthChange: (month: string) => void;
  selected?: string | null;
  onSelect: (day: string) => void;
  min?: string;
  max?: string;
  /** Gün başına sayı (ör. randevu adedi); gün altında nokta olarak gösterilir. */
  marks?: Record<string, number>;
  /** Başlıktan açılan yıl listesinin aralığı. Verilmezse başlık yalnızca ay seçimini açar. */
  years?: { from: number; to: number };
};

type Mode = "days" | "months" | "years";

export function MonthGrid({ month, onMonthChange, selected, onSelect, min, max, marks, years }: MonthGridProps) {
  const [mode, setMode] = useState<Mode>("days");
  const [y, m] = month.split("-").map(Number) as [number, number];
  const today = istanbulDayKey(new Date());
  const isDisabled = (day: string) => Boolean((min && day < min) || (max && day > max));
  const canPrev = !min || shiftMonth(month, -1) >= monthOf(min);
  const canNext = !max || shiftMonth(month, 1) <= monthOf(max);

  // Her zaman 6 hafta: önceki/sonraki ayın günleri soluk gösterilir, ızgara yüksekliği sabit kalır.
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const start = addDays(`${month}-01`, -firstWeekday);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));

  const title = mode === "years" ? "Yıl seçin" : mode === "months" ? String(y) : `${MONTHS[m - 1]} ${y}`;

  return (
    <div className="w-full select-none">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setMode(mode === "days" ? (years ? "years" : "months") : "days")}
          aria-label={mode === "days" ? "Ay veya yıl seç" : "Günlere dön"}
          className="flex min-h-9 cursor-pointer items-center gap-1 rounded-lg px-2 text-[15px] font-bold text-ink transition hover:bg-surface"
        >
          {title}
          <svg className={["h-4 w-4 text-muted transition", mode !== "days" ? "rotate-180" : ""].join(" ")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {mode === "days" ? (
          <div className="flex items-center overflow-hidden rounded-lg border border-line">
            <NavButton label="Önceki ay" disabled={!canPrev} onClick={() => onMonthChange(shiftMonth(month, -1))} dir="left" />
            <span className="h-5 w-px bg-line" aria-hidden="true" />
            <NavButton label="Sonraki ay" disabled={!canNext} onClick={() => onMonthChange(shiftMonth(month, 1))} dir="right" />
          </div>
        ) : null}
      </div>

      {mode === "years" && years ? (
        <div className="grid max-h-72 grid-cols-4 gap-1.5 overflow-y-auto pr-1">
          {Array.from({ length: years.to - years.from + 1 }, (_, i) => years.to - i).map((year) => (
            <PickCell
              key={year}
              active={year === y}
              onClick={() => {
                onMonthChange(`${year}-${pad(m)}`);
                setMode("months");
              }}
            >
              {year}
            </PickCell>
          ))}
        </div>
      ) : mode === "months" ? (
        <div className="grid grid-cols-3 gap-1.5">
          {MONTHS.map((name, i) => {
            const value = `${y}-${pad(i + 1)}`;
            const disabled = Boolean((min && value < monthOf(min)) || (max && value > monthOf(max)));
            return (
              <PickCell
                key={name}
                active={value === month}
                disabled={disabled}
                onClick={() => {
                  onMonthChange(value);
                  setMode("days");
                }}
              >
                {name}
              </PickCell>
            );
          })}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 text-center">
            {WEEKDAYS.map((d, i) => (
              <span key={d} className={["pb-2 text-xs font-semibold uppercase tracking-wide", i >= 5 ? "text-gs-red" : "text-muted"].join(" ")}>
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day) => {
              const outside = monthOf(day) !== month;
              const disabled = isDisabled(day);
              const isSelected = day === selected;
              const isToday = day === today;
              const mark = marks?.[day] ?? 0;
              return (
                <div key={day} className="flex justify-center">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (outside) onMonthChange(monthOf(day));
                      onSelect(day);
                    }}
                    aria-pressed={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={`${formatDayFull(day)}${mark ? `, ${mark} randevu` : ""}`}
                    className={[
                      "relative flex h-10 w-10 items-center justify-center rounded-full text-sm tabular-nums transition duration-150",
                      isSelected
                        ? "bg-gs-red font-bold text-white shadow-md shadow-gs-red/30"
                        : disabled
                          ? "cursor-not-allowed text-gray-300"
                          : outside
                            ? "cursor-pointer text-stone-500 hover:bg-surface"
                            : isToday
                              ? "cursor-pointer font-bold text-gs-red hover:bg-gs-red-soft"
                              : "cursor-pointer text-ink hover:bg-gs-red-soft",
                    ].join(" ")}
                  >
                    {Number(day.slice(8))}
                    {mark > 0 || (isToday && !isSelected) ? (
                      <span className="absolute bottom-1 flex gap-0.5" aria-hidden="true">
                        {mark > 0 ? (
                          Array.from({ length: Math.min(mark, 3) }, (_, i) => <span key={i} className={["h-1 w-1 rounded-full", isSelected ? "bg-white" : "bg-sky-500"].join(" ")} />)
                        ) : (
                          <span className="h-1 w-1 rounded-full bg-gs-red" />
                        )}
                      </span>
                    ) : null}
                  </button>
                </div>
              );
            })}
          </div>
          {!isDisabled(today) ? (
            <div className="mt-2 flex justify-end border-t border-line pt-2">
              <button
                type="button"
                onClick={() => {
                  onMonthChange(monthOf(today));
                  onSelect(today);
                }}
                className="min-h-8 cursor-pointer rounded-lg px-3 text-sm font-semibold text-gs-red transition hover:bg-gs-red-soft"
              >
                Bugün
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function PickCell({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={[
        "min-h-11 rounded-xl text-sm font-semibold transition",
        active ? "bg-gs-red text-white" : disabled ? "cursor-not-allowed text-gray-300" : "cursor-pointer text-ink hover:bg-gs-red-soft",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function NavButton({ label, disabled, onClick, dir }: { label: string; disabled: boolean; onClick: () => void; dir: "left" | "right" }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 cursor-pointer items-center justify-center text-ink transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-30"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
      </svg>
    </button>
  );
}

type DatePickerProps = {
  id?: string;
  value: string;
  onChange: (day: string) => void;
  min?: string;
  max?: string;
  invalid?: boolean;
  placeholder?: string;
  years?: { from: number; to: number };
  /** Değer boşken açılacak ay ("YYYY-MM"). */
  defaultMonth?: string;
  describedBy?: string;
  disabled?: boolean;
  /** Değeri temizleme düğmesi gösterilsin mi (opsiyonel filtreler için). */
  clearable?: boolean;
};

const POPOVER_WIDTH = 320;
const POPOVER_HEIGHT = 400;

/** Input görünümlü açılır takvim. Pencere sayfanın üstünde (portal) açılır; modal içinde kırpılmaz. */
export function DatePicker({ id, value, onChange, min, max, invalid, placeholder = "Tarih seçiniz", years, defaultMonth, describedBy, disabled, clearable }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => (value ? monthOf(value) : (defaultMonth ?? monthOf(istanbulDayKey(new Date())))));
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - 16);
    const below = window.innerHeight - rect.bottom;
    const top = below < POPOVER_HEIGHT + 16 && rect.top > below ? Math.max(8, rect.top - POPOVER_HEIGHT - 8) : rect.bottom + 8;
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
    setPos({ top, left, width });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, place]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => {
          if (!open && value) setMonth(monthOf(value));
          setOpen((o) => !o);
        }}
        className={[
          "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border bg-white px-3.5 text-left text-[16px] shadow-xs outline-none transition focus-visible:border-gs-red focus-visible:ring-2 focus-visible:ring-gs-red/25 disabled:cursor-not-allowed disabled:bg-gray-100",
          invalid ? "border-red-500" : open ? "border-gs-red ring-2 ring-gs-red/25" : "border-gray-300 hover:border-gray-400",
          clearable && value ? "pr-11" : "",
        ].join(" ")}
      >
        <svg className={["h-5 w-5 shrink-0", value ? "text-gs-red" : "text-muted"].join(" ")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 11h18" />
        </svg>
        <span className={["truncate", value ? "text-ink" : "text-stone-500"].join(" ")}>{value ? formatDayFull(value) : placeholder}</span>
      </button>
      {clearable && value && !disabled ? (
        <button
          type="button"
          aria-label="Tarihi temizle"
          onClick={() => onChange("")}
          className="absolute inset-y-0 right-1 my-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      ) : null}
      {open && pos
        ? createPortal(
            <div
              ref={popoverRef}
              id={popoverId}
              role="dialog"
              aria-label="Tarih seçin"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
              className="fixed z-[68] rounded-2xl border border-line bg-white p-4 shadow-2xl shadow-black/15"
            >
              <MonthGrid
                month={month}
                onMonthChange={setMonth}
                selected={value}
                min={min}
                max={max}
                years={years}
                onSelect={(day) => {
                  onChange(day);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

const PERIODS = [
  { label: "Sabah", test: (h: number) => h < 12 },
  { label: "Öğleden sonra", test: (h: number) => h >= 12 && h < 17 },
  { label: "Akşam", test: (h: number) => h >= 17 },
];

/** Saat seçimi: sabah / öğleden sonra / akşam gruplu düğmeler; `counts` o saatteki diğer randevu sayısıdır. */
export function TimeSlots({
  value,
  onChange,
  from = 9,
  to = 21,
  stepMinutes = 30,
  counts,
}: {
  value: string;
  onChange: (time: string) => void;
  from?: number;
  to?: number;
  stepMinutes?: number;
  counts?: Record<string, number>;
}) {
  const slots: string[] = [];
  for (let t = from * 60; t < to * 60; t += stepMinutes) slots.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
  if (value && !slots.includes(value)) slots.push(value);
  slots.sort();

  return (
    <div className="grid gap-4" role="radiogroup" aria-label="Saat">
      {PERIODS.map((period) => {
        const items = slots.filter((s) => period.test(Number(s.slice(0, 2))));
        if (items.length === 0) return null;
        return (
          <div key={period.label}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{period.label}</p>
            <div className="grid grid-cols-4 gap-1.5">
              {items.map((slot) => {
                const selected = slot === value;
                const count = counts?.[slot] ?? 0;
                return (
                  <button
                    key={slot}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={`${slot}${count ? `, ${count} randevu var` : ""}`}
                    onClick={() => onChange(slot)}
                    className={[
                      "flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-xl border text-sm font-semibold tabular-nums transition duration-150",
                      selected
                        ? "border-gs-red bg-gs-red text-white shadow-md shadow-gs-red/25"
                        : count > 0
                          ? "border-sky-200 bg-sky-50 text-ink hover:border-gs-red/50"
                          : "border-gray-200 bg-white text-ink hover:border-gs-red/50 hover:bg-gs-red-soft",
                    ].join(" ")}
                  >
                    {slot}
                    {count > 0 ? <span className={["text-[11px] font-medium leading-3", selected ? "text-white/85" : "text-sky-700"].join(" ")}>{count} dolu</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
