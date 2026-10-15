import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { equipmentOrders, feePeriods, registrations, type Registration } from "@/lib/db/schema";
import { listAgeGroups } from "@/lib/age-groups-db";
import { attendanceSummaries } from "@/lib/attendance";
import { accessMap, lastPayments, listPayments } from "@/lib/billing";
import { discountedFee, PAYMENT_METHOD_LABELS, type Access, type AccessState, type PaymentMethod } from "@/lib/billing-shared";
import { addDaysTo } from "@/lib/dates";
import { listOrders, type OrderRow } from "@/lib/equipment";
import { isFormaItem, socksOpen } from "@/lib/equipment-shared";
import { istanbulDayKey, resolveContactParent } from "@/lib/format";
import { attendanceReport } from "@/lib/reports";
import { defaultDateRange, inDateRange, previousDateRange, type DateRange } from "@/lib/date-range";
import { getSettings } from "@/lib/settings";

/**
 * Raporlar ekranı ve öğrenci süzgeçleri için özetler. Sorular sade: seçili aralıkta kasaya ne girdi, kimden para bekliyoruz,
 * bu hafta kimin hakkı yenileniyor, kim az geliyor, formalar ne durumda. Para bilgisi yalnız aidat izni olana.
 */

/** Bir kişi satırı: listelerde ara / WhatsApp düğmeleriyle gösterilir. */
export type PersonRow = { id: number; name: string; group: string | null; parentName: string; phone: string; day?: string | null; note?: string | null; amount?: number };

const SOON_DAYS = 7;

function groupNames(): Map<number, string> {
  return new Map(listAgeGroups().map((g) => [g.id, g.name]));
}

function enrolledRows(): Registration[] {
  return getDb().select().from(registrations).where(eq(registrations.status, "enrolled")).all();
}

function person(r: Registration, groups: Map<number, string>, extra: Partial<PersonRow> = {}): PersonRow {
  const contact = resolveContactParent(r);
  return { id: r.id, name: r.studentFullName, group: r.groupId ? (groups.get(r.groupId) ?? null) : null, parentName: contact.fullName, phone: contact.phone, ...extra };
}

/* ---------------- Para ---------------- */

export type MoneyOverview = {
  range: DateRange;
  collected: number;
  previousCollected: number;
  byMethod: { label: string; count: number; amount: number }[];
  /** Seçili aralıktaki ödeme günleri, eskiden yeniye. */
  trend: { day: string; amount: number }[];
  /** Seçili aralıkta başlayan hak paketleri: beklenen ve ödenen. */
  expected: number;
  expectedPaid: number;
  /** Şu an: aidatı gelmeyenler. */
  outstanding: { amount: number; students: number; locked: number; grace: number; promise: number };
  /** Şu an: hakkı önümüzdeki 7 günde yenilenecekler (tarihe göre). */
  renewals: PersonRow[];
  /** Şu an: ödeme sözü verenler (tutulmayanlar önce). */
  promises: (PersonRow & { missed: boolean })[];
  /** Şu an: gruplara göre aidat durumu. */
  byGroup: { groupId: number | null; group: string; paid: number; grace: number; promise: number; locked: number; total: number }[];
  kit: { collectedInRange: number; unpaidAmount: number; unpaidCount: number; toOrder: number; formaMissing: number };
};

export function moneyOverview(range: DateRange, today: string): MoneyOverview {
  const groups = groupNames();
  const { from, to } = range;
  const previous = previousDateRange(range);
  const payments = listPayments({ from: previous.from, to, limit: -1 }).filter((p) => !p.voidedAt);
  const current = payments.filter(p => inDateRange(p.paidOn, range));
  const previousPayments = payments.filter(p => inDateRange(p.paidOn, previous));
  const daily = new Map<string, number>();
  for (const payment of current) daily.set(payment.paidOn, (daily.get(payment.paidOn) ?? 0) + payment.amountKurus);
  const methods = new Map<string, { count: number; amount: number }>();
  for (const p of current) {
    const label = PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method;
    const m = methods.get(label) ?? { count: 0, amount: 0 };
    methods.set(label, { count: m.count + 1, amount: m.amount + p.amountKurus });
  }
  const sum = (list: { amountKurus: number }[]) => list.reduce((s, p) => s + p.amountKurus, 0);

  const periods = getDb().select().from(feePeriods).where(and(gte(feePeriods.startDate, from), lte(feePeriods.startDate, to))).all().filter((p) => p.status !== "void");

  const enrolled = enrolledRows();
  const access = accessMap(enrolled, today);
  const soon = addDaysTo(today, SOON_DAYS);
  const fee = getSettings().feeAmountKurus;
  let amount = 0;
  let locked = 0;
  let grace = 0;
  let promise = 0;
  const renewals: PersonRow[] = [];
  const promises: MoneyOverview["promises"] = [];
  const byGroup = new Map<string, MoneyOverview["byGroup"][number]>();
  for (const r of enrolled) {
    const a = access.get(r.id);
    if (!a) continue;
    const key = r.groupId ? String(r.groupId) : "none";
    const g = byGroup.get(key) ?? { groupId: r.groupId, group: r.groupId ? (groups.get(r.groupId) ?? "Grup") : "Grupsuz", paid: 0, grace: 0, promise: 0, locked: 0, total: 0 };
    g.total++;
    if (a.state === "paid" || a.state === "unbilled") g.paid++;
    if (a.state === "grace") g.grace++;
    if (a.state === "override") g.promise++;
    if (a.state === "locked") g.locked++;
    byGroup.set(key, g);
    if (a.state === "grace" || a.state === "locked" || a.state === "override") amount += a.amountDueKurus;
    if (a.state === "locked") locked++;
    if (a.state === "grace") grace++;
    if (a.state === "override") promise++;
    if (a.state === "paid" && a.paidUntil && a.paidUntil <= soon) renewals.push(person(r, groups, { day: a.paidUntil, amount: discountedFee(fee, r.discountPercent) }));
    if (a.state === "override" && a.override) promises.push({ ...person(r, groups, { day: a.override.endsOn, note: a.override.reason, amount: a.amountDueKurus }), missed: false });
    else if (a.promiseMissed) promises.push({ ...person(r, groups, { day: a.promiseMissed, amount: a.amountDueKurus }), missed: true });
  }
  renewals.sort((x, y) => (x.day ?? "").localeCompare(y.day ?? "") || x.name.localeCompare(y.name, "tr"));
  promises.sort((x, y) => Number(y.missed) - Number(x.missed) || (x.day ?? "").localeCompare(y.day ?? ""));

  const orders = listOrders().filter((o) => o.studentStatus === "enrolled");
  const kitPaidInRange = getDb()
    .select({ price: equipmentOrders.priceKurus, paidOn: equipmentOrders.paidOn, paid: equipmentOrders.paid })
    .from(equipmentOrders)
    .where(and(eq(equipmentOrders.paid, true), gte(equipmentOrders.paidOn, from), lte(equipmentOrders.paidOn, to)))
    .all();
  const unpaid = orders.filter((o) => !o.paid);

  return {
    range,
    collected: sum(current),
    previousCollected: sum(previousPayments),
    byMethod: [...methods.entries()].map(([label, v]) => ({ label, ...v })),
    trend: [...daily].sort(([a], [b]) => a.localeCompare(b)).map(([day, amount]) => ({ day, amount })),
    expected: periods.reduce((s, p) => s + p.amountKurus, 0),
    expectedPaid: periods.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountKurus, 0),
    outstanding: { amount, students: locked + grace + promise, locked, grace, promise },
    renewals,
    promises,
    byGroup: [...byGroup.values()].sort((x, y) => x.group.localeCompare(y.group, "tr")),
    kit: {
      collectedInRange: kitPaidInRange.reduce((s, o) => s + o.price, 0),
      unpaidAmount: unpaid.reduce((s, o) => s + o.priceKurus, 0),
      unpaidCount: unpaid.length,
      toOrder: orders.filter((o) => o.delivery === "to_order").length + orders.filter((o) => o.sockDelivery === "to_order").length,
      formaMissing: enrolled.filter((r) => !orders.some((o) => o.registrationId === r.id && isFormaItem(o.itemName))).length,
    },
  };
}

/* ---------------- Öğrenciler ve başvurular ---------------- */

export type PeopleOverview = {
  enrolled: number;
  newInRange: number;
  leftInRange: number;
  byGroup: { groupId: number | null; group: string; count: number }[];
  /** Seçili aralıkta gelen başvurular ve bugün neredeler. */
  applications: { total: number; enrolled: number; scheduled: number; waiting: number; dropped: number };
};

export function peopleOverview(range: DateRange): PeopleOverview {
  const groups = groupNames();
  const all = getDb().select().from(registrations).all();
  const inRange = (iso: string | null) => Boolean(iso) && inDateRange(istanbulDayKey(iso!), range);
  const enrolled = all.filter((r) => r.status === "enrolled");
  const counts = new Map<string, { groupId: number | null; group: string; count: number }>();
  for (const g of listAgeGroups()) counts.set(String(g.id), { groupId: g.id, group: g.name, count: 0 });
  for (const r of enrolled) {
    const key = r.groupId ? String(r.groupId) : "none";
    const row = counts.get(key) ?? { groupId: r.groupId, group: r.groupId ? (groups.get(r.groupId) ?? "Grup") : "Grupsuz", count: 0 };
    row.count++;
    counts.set(key, row);
  }
  const apps = all.filter((r) => inRange(r.createdAt));
  return {
    enrolled: enrolled.length,
    newInRange: all.filter((r) => (r.status === "enrolled" || r.status === "left") && inRange(r.enrolledAt)).length,
    leftInRange: all.filter((r) => r.status === "left" && inRange(r.leftAt)).length,
    byGroup: [...counts.values()].filter((g) => g.count > 0 || g.groupId !== null),
    applications: {
      total: apps.length,
      enrolled: apps.filter((r) => r.status === "enrolled" || r.status === "left").length,
      scheduled: apps.filter((r) => r.status === "scheduled").length,
      waiting: apps.filter((r) => r.status === "pending" || r.status === "no_show").length,
      dropped: apps.filter((r) => r.status === "cancelled").length,
    },
  };
}

/* ---------------- Öğrenci süzgeçleri ---------------- */

/** Öğrenci listesinde hazır süzgeçler için öğrenci başına özet (seçilen günlerde devam). */
export type StudentInsight = {
  access?: AccessState;
  paidUntil?: string | null;
  promiseDay?: string | null;
  promiseMissed?: boolean;
  /** none: forma kaydı yok · unpaid: parası alınmamış malzeme · order: teslim bekliyor · ok */
  kit?: "none" | "unpaid" | "order" | "ok";
  /** Forma bedeni (forma kaydı varsa). */
  kitSize?: string | null;
  /** Son aidat ödemesi (iptal edilmeyen). */
  lastPayment?: { paidOn: string; method: PaymentMethod; amountKurus: number } | null;
  attendanceRate: number | null;
  attended: number;
};

export function studentInsights(ids: number[], today: string, perms: { billing: boolean }, range: DateRange = defaultDateRange(today)): Record<number, StudentInsight> {
  const out: Record<number, StudentInsight> = {};
  if (!ids.length) return out;
  const att = attendanceSummaries(ids, range.from, range.to);
  let access = new Map<number, Access>();
  let ordersBy = new Map<number, OrderRow[]>();
  let payments = new Map<number, NonNullable<StudentInsight["lastPayment"]>>();
  if (perms.billing) {
    access = accessMap(ids.map((id) => ({ id, status: "enrolled" })), today);
    ordersBy = new Map();
    for (const o of listOrders()) ordersBy.set(o.registrationId, [...(ordersBy.get(o.registrationId) ?? []), o]);
    payments = lastPayments(ids);
  }
  for (const id of ids) {
    const s = att.get(id);
    const row: StudentInsight = { attendanceRate: s?.rate ?? null, attended: s ? s.present + s.absent : 0 };
    if (perms.billing) {
      const a = access.get(id);
      const os = ordersBy.get(id) ?? [];
      row.access = a?.state;
      row.paidUntil = a?.paidUntil ?? null;
      row.promiseDay = a?.state === "override" ? (a.override?.endsOn ?? null) : (a?.promiseMissed ?? null);
      row.promiseMissed = Boolean(a?.promiseMissed);
      row.kitSize = os.find((o) => isFormaItem(o.itemName))?.size ?? null;
      row.lastPayment = payments.get(id) ?? null;
      row.kit = !os.some((o) => isFormaItem(o.itemName)) ? "none" : os.some((o) => !o.paid) ? "unpaid" : os.some((o) => o.delivery !== "delivered" || socksOpen(o)) ? "order" : "ok";
    }
    out[id] = row;
  }
  return out;
}

/* ---------------- Devam ---------------- */

export type AttendanceOverview = {
  /** Seçilen aralıkta yoklaması alınan (geldi + gelmedi) toplamlar. */
  present: number;
  absent: number;
  rate: number | null;
  sessions: number;
  groups: { group: string; sessions: number; present: number; absent: number; rate: number | null }[];
  /** Devamı %60'ın altında olanlar (en az 3 yoklama), en düşük önce. */
  low: (PersonRow & { rate: number; present: number; total: number })[];
};

export function attendanceOverview(range: DateRange): AttendanceOverview {
  const report = attendanceReport(range);
  const present = report.groups.reduce((s, g) => s + g.present, 0);
  const absent = report.groups.reduce((s, g) => s + g.absent, 0);
  const lowRows = report.students.filter((s) => s.rate !== null && s.rate < 60 && s.present + s.absent >= 3).sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0));
  const groups = groupNames();
  const regs = new Map(lowRows.length ? getDb().select().from(registrations).all().map((r) => [r.id, r]) : []);
  return {
    present,
    absent,
    rate: present + absent ? Math.round((present / (present + absent)) * 100) : null,
    sessions: report.groups.reduce((s, g) => s + g.sessions, 0),
    groups: report.groups.filter((g) => g.sessions > 0 || g.present + g.absent > 0),
    low: lowRows.flatMap((s) => {
      const r = regs.get(s.id);
      return r && r.status === "enrolled" ? [{ ...person(r, groups), rate: s.rate ?? 0, present: s.present, total: s.present + s.absent }] : [];
    }),
  };
}
