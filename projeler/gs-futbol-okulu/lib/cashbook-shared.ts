import type { PaymentMethod } from "@/lib/billing-shared";
import { normalizeForSearch } from "@/lib/search";

/** Kasa defterinin client'ta da kullanılan tipleri ve toplamları (DB bağımlılığı yok). */

export type CashEntry = {
  /** "a-12" aidat ödemesi, "f-5" malzeme kaydı */
  key: string;
  kind: "aidat" | "forma";
  id: number;
  registrationId: number;
  studentName: string;
  studentNo: number | null;
  day: string;
  method: PaymentMethod;
  amountKurus: number;
  /** "8 antrenman" / "Forma · 10-11 yaş" */
  what: string;
  receiptNo: string | null;
  takenBy: string | null;
  note: string | null;
  /** Okula kayıt sırasında alındı. */
  atEnrollment: boolean;
  voided: boolean;
  voidReason: string | null;
  /** Gün içinde sıralama (kayıt zamanı). */
  at: string;
};

export type CashTotals = { total: number; cash: number; eft: number; aidat: number; forma: number; count: number };
export type CashDay = CashTotals & { day: string; entries: CashEntry[] };

export type CashFilter = { kind?: "all" | "cash" | "eft" | "aidat" | "forma"; query?: string; showVoided?: boolean };

/** Ekran özeti, günler ve Excel aynı seçimi kullanır. */
export function filterCashEntries(entries: CashEntry[], { kind = "all", query = "", showVoided = false }: CashFilter = {}): CashEntry[] {
  const q = normalizeForSearch(query.trim());
  return entries.filter(entry =>
    (showVoided || !entry.voided) &&
    (kind === "all" || entry.method === kind || entry.kind === kind) &&
    (!q || normalizeForSearch(entry.studentName).includes(q) || (entry.receiptNo ?? "").includes(query.trim()) || String(entry.studentNo ?? "") === query.trim()),
  );
}

/** İptal edilmemiş kayıtların toplamları. */
export function cashTotals(entries: CashEntry[]): CashTotals {
  const t: CashTotals = { total: 0, cash: 0, eft: 0, aidat: 0, forma: 0, count: 0 };
  for (const e of entries) {
    if (e.voided) continue;
    t.total += e.amountKurus;
    t.count++;
    if (e.method === "eft") t.eft += e.amountKurus;
    else t.cash += e.amountKurus;
    if (e.kind === "forma") t.forma += e.amountKurus;
    else t.aidat += e.amountKurus;
  }
  return t;
}

/** Kayıtları günlere ayırır (yeniden eskiye). */
export function groupByDay(entries: CashEntry[]): CashDay[] {
  const days = new Map<string, CashEntry[]>();
  for (const e of entries) days.set(e.day, [...(days.get(e.day) ?? []), e]);
  return [...days.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([day, list]) => ({ day, entries: list, ...cashTotals(list) }));
}
