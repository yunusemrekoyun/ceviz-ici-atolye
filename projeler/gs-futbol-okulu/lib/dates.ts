// Takvim günü yardımcıları: "YYYY-MM-DD" metinleri üzerinde, saat dilimi karışmadan çalışır.

const pad = (n: number) => String(n).padStart(2, "0");

export function parseDay(day: string): { y: number; m: number; d: number } {
  const [y, m, d] = day.split("-").map(Number);
  return { y: y ?? 1970, m: m ?? 1, d: d ?? 1 };
}

export function makeDay(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addDaysTo(day: string, n: number): string {
  const { y, m, d } = parseDay(day);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return makeDay(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

export function diffDays(a: string, b: string): number {
  const pa = parseDay(a);
  const pb = parseDay(b);
  return Math.round((Date.UTC(pa.y, pa.m - 1, pa.d) - Date.UTC(pb.y, pb.m - 1, pb.d)) / 86_400_000);
}

function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const idx = y * 12 + (m - 1) + delta;
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
}

/** Ayın kesim günü: 29-31 kısa aylarda ayın son gününe yuvarlanır. */
export function billingOccurrence(y: number, m: number, billingDay: number): string {
  return makeDay(y, m, Math.min(billingDay, daysInMonth(y, m)));
}

/** Verilen günden önceki (veya o gün olan) en son kesim günü. */
export function latestBillingOnOrBefore(day: string, billingDay: number): string {
  const { y, m } = parseDay(day);
  const here = billingOccurrence(y, m, billingDay);
  if (here <= day) return here;
  const prev = shiftMonth(y, m, -1);
  return billingOccurrence(prev.y, prev.m, billingDay);
}

/** Dönem sonu: başlangıcın bir sonraki ayındaki kesim günü. */
export function periodEnd(start: string, billingDay: number): string {
  const { y, m } = parseDay(start);
  const next = shiftMonth(y, m, 1);
  return billingOccurrence(next.y, next.m, billingDay);
}
