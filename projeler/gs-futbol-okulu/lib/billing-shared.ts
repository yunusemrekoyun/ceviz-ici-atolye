// Aidat hesapları: veritabanına dokunmaz; sunucu ve istemci aynı kuralı kullanır.
import { addDaysTo, diffDays } from "@/lib/dates";

export type PeriodLite = { id: number; startDate: string; endDate: string; dueDate: string; amountKurus: number; status: string };
export type OverrideLite = { id: number; startsOn: string; endsOn: string; reason: string; revokedAt: string | null; fulfilledAt: string | null };

/** Ödeme sözü notu boş bırakılınca saklanan metin. */
export const PROMISE_DEFAULT = "Ödeme sözü";

export type AccessState =
  | "inactive" // kayıtlı öğrenci değil (ayrıldı vb.)
  | "unbilled" // aidat sistemi henüz başlamadı (tutar girilmemiş)
  | "paid"
  | "grace" // ödeme bekleniyor, tolerans içinde
  | "override" // kilitli ama admin süreli açtı
  | "locked";

export type Access = {
  state: AccessState;
  allowed: boolean;
  /** Ödenmemiş en eski dönemin son ödeme günü. */
  dueDate: string | null;
  /** Kilitlenmeden önceki son gün (tolerans içindeyse). */
  lastDay: string | null;
  daysLeft: number | null;
  unpaidCount: number;
  amountDueKurus: number;
  /** Hakkı varsa yenileme tarihi: ödenmiş son paketi aşan ilk antrenman günü. */
  paidUntil: string | null;
  /** Hakkı varsa bugünden yenileme tarihine kadar kalan antrenman (sunucuda doldurulur). */
  sessionsLeft?: number | null;
  /** Hiç hakkı verilmemiş öğrencinin ilk aidatı bekleniyor (yenileme değil). */
  firstPack?: boolean;
  /** Tutulmayan ödeme sözünün günü (söz verdi, gün geçti, ödeme gelmedi). */
  promiseMissed?: string | null;
  override: OverrideLite | null;
};

/** Bir aidat = grubun 8 antrenmanı. */
export const SESSIONS_PER_PACK = 8;

export const ACCESS_LABELS: Record<AccessState, string> = {
  inactive: "Aktif değil",
  unbilled: "Aidat başlamadı",
  paid: "Hakkı var",
  grace: "Aidat bekleniyor",
  override: "Söz verdi",
  locked: "Hakkı yok",
};

export const ACCESS_BADGE: Record<AccessState, string> = {
  inactive: "bg-stone-100 text-stone-600 ring-1 ring-inset ring-stone-500/15",
  unbilled: "bg-stone-100 text-stone-700 ring-1 ring-inset ring-stone-500/15",
  paid: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20",
  grace: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/25",
  override: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-600/20",
  locked: "bg-red-50 text-red-800 ring-1 ring-inset ring-red-600/20",
};

/**
 * Yönetim ekranlarında ödeme dili (K-19): personel "hakkı var / yok" yerine "ödedi, ödemesi yaklaşıyor, gecikti" diye
 * düşünür. Yoklama, kart okutma ve antrenör tarafı hak dilini (ACCESS_LABELS) kullanmaya devam eder.
 */
export type PayStatus = "late" | "due" | "first" | "promise" | "soon" | "paid" | "unbilled" | "inactive";

/** Ödemesi yaklaşıyor: sonraki ödeme günü bu kadar gün içinde. */
export const SOON_DAYS = 7;

export const PAY_STATUS: Record<PayStatus, { label: string; hint: string; badge: string; dot: string; order: number }> = {
  late: { label: "Gecikti", hint: "Ödeme günü ve ek süre geçti; aidatı gelene kadar antrenmana katılamıyor.", badge: ACCESS_BADGE.locked, dot: "bg-red-600", order: 0 },
  due: { label: "Ödeme günü geldi", hint: "8 antrenmanı bitti, ek süre içinde; antrenmana devam ediyor.", badge: ACCESS_BADGE.grace, dot: "bg-amber-500", order: 1 },
  first: { label: "İlk aidat bekleniyor", hint: "Yeni kayıt; ilk aidatı gelince 8 antrenman hakkı başlar.", badge: ACCESS_BADGE.grace, dot: "bg-amber-400", order: 2 },
  promise: { label: "Söz verdi", hint: "Veli ödeyeceği günü söyledi; o güne kadar antrenmana devam ediyor.", badge: ACCESS_BADGE.override, dot: "bg-sky-500", order: 3 },
  soon: { label: "Ödemesi yaklaşıyor", hint: `Ödedi; ${SOON_DAYS} gün içinde sonraki ödeme günü geliyor.`, badge: "bg-gs-yellow-soft text-ink ring-1 ring-inset ring-gs-yellow/70", dot: "bg-gs-yellow", order: 4 },
  paid: { label: "Ödedi", hint: "Aidatı ödendi, antrenman hakkı sürüyor.", badge: ACCESS_BADGE.paid, dot: "bg-emerald-600", order: 5 },
  unbilled: { label: "Aidat başlamadı", hint: "Aidat tutarı girilmedi.", badge: ACCESS_BADGE.unbilled, dot: "bg-stone-400", order: 6 },
  inactive: { label: "Kayıtlı değil", hint: "", badge: ACCESS_BADGE.inactive, dot: "bg-stone-300", order: 7 },
};

export function payStatus(a: Pick<Access, "state" | "firstPack" | "paidUntil">, today: string): PayStatus {
  switch (a.state) {
    case "locked":
      return "late";
    case "grace":
      return a.firstPack ? "first" : "due";
    case "override":
      return "promise";
    case "paid":
      return today && a.paidUntil && a.paidUntil <= addDaysTo(today, SOON_DAYS) ? "soon" : "paid";
    case "unbilled":
      return "unbilled";
    default:
      return "inactive";
  }
}

export const PAYMENT_METHODS = ["cash", "eft"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = { cash: "Nakit", eft: "Havale / EFT" };

export function computeAccess(input: {
  enrolled: boolean;
  periods: PeriodLite[];
  overrides: OverrideLite[];
  today: string;
  graceDays: number;
}): Access {
  const base: Access = { state: "inactive", allowed: false, dueDate: null, lastDay: null, daysLeft: null, unpaidCount: 0, amountDueKurus: 0, paidUntil: null, override: null };
  if (!input.enrolled) return base;
  const live = input.periods.filter((p) => p.status !== "void");
  if (live.length === 0) return { ...base, state: "unbilled", allowed: true };

  // Hiç hakkı verilmemiş yeni öğrencinin ilk paketi, ilk antrenmanından önce de beklenen aidat sayılır.
  const neverPaid = !live.some((p) => p.status === "paid");
  const unpaid = live.filter((p) => p.status === "open" && (p.startDate <= input.today || neverPaid)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (unpaid.length === 0) {
    const paidUntil = live.filter((p) => p.status === "paid").reduce<string | null>((max, p) => (!max || p.endDate > max ? p.endDate : max), null);
    return { ...base, state: "paid", allowed: true, paidUntil };
  }

  const oldest = unpaid[0]!;
  const lockOn = addDaysTo(oldest.dueDate, input.graceDays);
  const common = { dueDate: oldest.dueDate, unpaidCount: unpaid.length, amountDueKurus: unpaid.reduce((s, p) => s + p.amountKurus, 0), firstPack: neverPaid };
  // Ödeme sözü: söz günü dahil hak sürer; ödeme gelince söz kapanır (fulfilledAt).
  const promises = input.overrides.filter((o) => !o.revokedAt && !o.fulfilledAt);
  const override = promises.find((o) => o.startsOn <= input.today && input.today <= o.endsOn) ?? null;
  if (override) return { ...base, ...common, state: "override", allowed: true, override, lastDay: override.endsOn, daysLeft: diffDays(addDaysTo(override.endsOn, 1), input.today) };
  const promiseMissed = promises.filter((o) => o.endsOn < input.today).reduce<string | null>((max, o) => (!max || o.endsOn > max ? o.endsOn : max), null);
  if (input.today < lockOn) {
    const lastDay = addDaysTo(lockOn, -1);
    return { ...base, ...common, state: "grace", allowed: true, lastDay, daysLeft: diffDays(lockOn, input.today), promiseMissed };
  }
  return { ...base, ...common, state: "locked", allowed: false, promiseMissed };
}

export function formatMoney(kurus: number): string {
  const tl = kurus / 100;
  return `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: Number.isInteger(tl) ? 0 : 2, maximumFractionDigits: 2 }).format(tl)} ₺`;
}

/** "1.500", "1500,50" gibi girdileri kuruşa çevirir. */
export function parseMoney(input: string): number | null {
  const clean = input.replace(/[^\d.,]/g, "").trim();
  if (!clean) return null;
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(clean) ? clean.replace(/\./g, "") : clean;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

/** "2026-09-05" → "5 Eylül 2026" */
export function dayLabel(day: string, withYear = true): string {
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return day;
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ""}`;
}

/** "2026-09-30" → "30 Eylül'de" (ay adına göre -de/-da/-te/-ta). */
export function dayLabelAt(day: string): string {
  const m = Number(day.slice(5, 7));
  const suffix = ["'ta", "'ta", "'ta", "'da", "'ta", "'da", "'da", "'ta", "'de", "'de", "'da", "'ta"][m - 1] ?? "'de";
  return `${dayLabel(day, false)}${suffix}`;
}

/** Dönem aralığı: "5 Eylül – 5 Ekim 2026" (bitiş günü hariç tutulur, kesim günü gösterilir). */
export function periodRangeLabel(start: string, end: string): string {
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${dayLabel(start, !sameYear)} – ${dayLabel(end)}`;
}

/** İndirimli paket tutarı (kuruş): tam liraya yuvarlanır. */
export function discountedFee(feeKurus: number, percent: number | null | undefined): number {
  const p = Math.min(100, Math.max(0, percent ?? 0));
  if (!p) return feeKurus;
  return Math.round((feeKurus * (100 - p)) / 100 / 100) * 100;
}
