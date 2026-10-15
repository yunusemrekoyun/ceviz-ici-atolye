import { addDaysTo } from "@/lib/dates";

export type DateRange = { from: string; to: string };
export const ATTENDANCE_START = "2026-09-26";

/** Tarih aralığı, ay sınırlarından bağımsız ve iki uç dahil hesaplanır. */
export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function defaultDateRange(today: string): DateRange {
  return { from: today < ATTENDANCE_START ? today : ATTENDANCE_START, to: today };
}

export function validDateRange(range: DateRange): boolean {
  return isDateKey(range.from) && isDateKey(range.to) && range.from <= range.to;
}

export function resolveDateRange(params: Record<string, unknown>, today: string): DateRange {
  const defaults = defaultDateRange(today);
  const from = isDateKey(params.from) ? params.from : defaults.from;
  const to = isDateKey(params.to) ? params.to : defaults.to;
  return from <= to ? { from, to } : defaults;
}

export function inDateRange(day: string | null | undefined, range: DateRange): boolean {
  return Boolean(day && day >= range.from && day <= range.to);
}

export function dateRangeQuery(range: DateRange): string {
  return new URLSearchParams(range).toString();
}

export function withDateRange(href: string, range: DateRange): string {
  const url = new URL(href, "http://local");
  url.searchParams.delete("ay");
  url.searchParams.set("from", range.from);
  url.searchParams.set("to", range.to);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function dateRangeLabel(range: DateRange): string {
  const label = (day: string) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
  return range.from === range.to ? label(range.from) : `${label(range.from)} – ${label(range.to)}`;
}

/** Aynı uzunluktaki önceki aralık; ay ya da takvim dönemine yuvarlanmaz. */
export function previousDateRange(range: DateRange): DateRange {
  const days = Math.round((Date.parse(`${range.to}T12:00:00Z`) - Date.parse(`${range.from}T12:00:00Z`)) / 86400000) + 1;
  return { from: addDaysTo(range.from, -days), to: addDaysTo(range.from, -1) };
}
