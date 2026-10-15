import { and, inArray, isNull } from "drizzle-orm";
import { listAgeGroups } from "@/lib/age-groups-db";
import { attendanceSummaries } from "@/lib/attendance";
import { accessMap, ensurePeriodsToday, todayKey } from "@/lib/billing";
import { discountedFee, PAY_STATUS, PAYMENT_METHOD_LABELS, payStatus, type Access, type PaymentMethod } from "@/lib/billing-shared";
import { defaultDateRange, inDateRange, type DateRange } from "@/lib/date-range";
import { getDb } from "@/lib/db";
import { payments, type Registration } from "@/lib/db/schema";
import { listOrders } from "@/lib/equipment";
import { DELIVERY_LABEL, isFormaItem, shirtLabel, type Delivery } from "@/lib/equipment-shared";
import { weeklyProgram } from "@/lib/program-sheets";
import { getSettings } from "@/lib/settings";

/**
 * Excel / PDF çıktılarının hesaplanan sütunları (lib/export/columns.ts'te `computed`): grubun yaş aralığı ve programı,
 * aidat durumu ve son ödeme, forma, seçilen aralıkta devam ve alınan aidat. Tutarlar kuruş, tarihler "YYYY-MM-DD".
 */
export type ExtraRecord = Record<string, string | number | null>;

const deliveryText = (d: string) => (DELIVERY_LABEL[d as Delivery] ?? d).toLocaleLowerCase("tr-TR");

/** "2015–2016" doğumlu grubun bugünkü yaşları: "9–11". */
export function groupAgeRange(minBirthYear: number, maxBirthYear: number, today: string = todayKey()): string {
  const year = Number(today.slice(0, 4));
  const lo = year - maxBirthYear - 1;
  const hi = year - minBirthYear;
  return lo === hi ? String(hi) : `${Math.max(lo, 0)}–${hi}`;
}

export function extraRecords(regs: Registration[], opts: { billing: boolean; today?: string; range?: DateRange }): Map<number, ExtraRecord> {
  const today = opts.today ?? todayKey();
  const range = opts.range ?? defaultDateRange(today);
  const out = new Map<number, ExtraRecord>();
  if (regs.length === 0) return out;
  const groups = new Map(listAgeGroups().map((g) => [g.id, g]));
  const program = new Map(weeklyProgram(today).rows.map((r) => [r.groupId, r]));
  const ids = regs.map((r) => r.id);
  const att = attendanceSummaries(ids, range.from, range.to);

  let access = new Map<number, Access>();
  const last = new Map<number, { paidOn: string; amount: number; method: string }>();
  const totals = new Map<number, number>();
  const kit = new Map<number, string[]>();
  const forma = new Map<number, { shirt: string; state: string; paid: string; socks: string; socksState: string }>();
  const tracksuit = new Map<number, string[]>();
  const fee = getSettings().feeAmountKurus;
  if (opts.billing) {
    ensurePeriodsToday();
    access = accessMap(
      regs.filter((r) => r.status === "enrolled"),
      today,
    );
    const rows = getDb()
      .select({ reg: payments.registrationId, paidOn: payments.paidOn, amount: payments.amountKurus, method: payments.method, id: payments.id })
      .from(payments)
      .where(and(inArray(payments.registrationId, ids), isNull(payments.voidedAt)))
      .all()
      .sort((a, b) => a.paidOn.localeCompare(b.paidOn) || a.id - b.id);
    for (const p of rows) {
      last.set(p.reg, { paidOn: p.paidOn, amount: p.amount, method: p.method });
      if (inDateRange(p.paidOn, range)) totals.set(p.reg, (totals.get(p.reg) ?? 0) + p.amount);
    }
    const wanted = new Set(ids);
    for (const o of listOrders()) {
      if (!wanted.has(o.registrationId)) continue;
      const sizes = [shirtLabel(o.size), o.sockSize ? `tozluk ${o.sockSize}` : null].filter(Boolean).join(", ");
      const socks = o.sockDelivery ? `; tozluk ${deliveryText(o.sockDelivery)}` : "";
      const text = `${o.itemName}${sizes ? ` (${sizes})` : ""}: ${o.owned ? "zaten var" : `${o.paid ? "ödendi" : "ödenmedi"}, ${deliveryText(o.delivery)}`}${socks}`;
      kit.set(o.registrationId, [...(kit.get(o.registrationId) ?? []), text]);
      const state = o.owned ? "Zaten var" : (DELIVERY_LABEL[o.delivery as Delivery] ?? o.delivery);
      if (isFormaItem(o.itemName)) {
        if (!forma.has(o.registrationId))
          forma.set(o.registrationId, {
            shirt: shirtLabel(o.size) ?? "",
            state,
            paid: o.owned ? "—" : o.paid ? "Ödendi" : "Ödenmedi",
            socks: o.sockSize ?? "",
            socksState: o.sockDelivery ? (DELIVERY_LABEL[o.sockDelivery as Delivery] ?? o.sockDelivery) : "",
          });
      } else tracksuit.set(o.registrationId, [...(tracksuit.get(o.registrationId) ?? []), [o.itemName === "Eşofman" ? null : o.itemName, shirtLabel(o.size), state.toLocaleLowerCase("tr-TR"), o.owned ? null : o.paid ? "ödendi" : "ödenmedi"].filter(Boolean).join(" · ")]);
    }
  }

  for (const r of regs) {
    const g = r.groupId ? groups.get(r.groupId) : undefined;
    const p = r.groupId ? program.get(r.groupId) : undefined;
    const a = att.get(r.id);
    const rec: ExtraRecord = {
      groupYears: g ? (g.minBirthYear === g.maxBirthYear ? String(g.minBirthYear) : `${g.minBirthYear}–${g.maxBirthYear}`) : "",
      groupAges: g ? `${groupAgeRange(g.minBirthYear, g.maxBirthYear, today)} yaş` : "",
      schedule: p?.slots.map((s) => `${s.day} ${s.startTime}–${s.endTime}`).join(", ") ?? "",
      venue: p ? [...new Set(p.slots.map((s) => s.venue).filter(Boolean))].join(", ") : "",
      coach: p?.coaches.join(", ") ?? "",
      attendanceRate: a && a.rate !== null ? a.rate : null,
      attended: a ? a.present : null,
      missed: a ? a.absent : null,
    };
    if (opts.billing) {
      const ac = access.get(r.id);
      const st = ac ? payStatus(ac, today) : null;
      const l = last.get(r.id);
      Object.assign(rec, {
        payStatus: st ? PAY_STATUS[st].label : r.status === "enrolled" ? "" : "Kayıtlı değil",
        nextPayment: ac ? (ac.state === "paid" ? ac.paidUntil : ac.state === "override" ? (ac.override?.endsOn ?? ac.dueDate) : ac.dueDate) : null,
        amountDue: ac && (ac.state === "grace" || ac.state === "locked" || ac.state === "override") ? ac.amountDueKurus : 0,
        monthlyFee: r.status === "enrolled" ? discountedFee(fee, r.discountPercent) : null,
        discount: r.discountName && r.discountPercent ? `${r.discountName} %${r.discountPercent}` : "",
        lastPaymentOn: l?.paidOn ?? null,
        lastPaymentAmount: l?.amount ?? null,
        lastPaymentMethod: l ? (PAYMENT_METHOD_LABELS[l.method as PaymentMethod] ?? l.method) : "",
        paidTotal: totals.get(r.id) ?? 0,
        kit: (kit.get(r.id) ?? []).join("; ") || (r.status === "enrolled" ? "Forma girilmedi" : ""),
        kitShirt: forma.get(r.id)?.shirt ?? "",
        kitState: forma.get(r.id)?.state ?? (r.status === "enrolled" ? "Girilmedi" : ""),
        kitPaid: forma.get(r.id)?.paid ?? "",
        kitSocks: forma.get(r.id)?.socks ?? "",
        kitSocksState: forma.get(r.id)?.socksState ?? "",
        tracksuit: (tracksuit.get(r.id) ?? []).join("; "),
      });
    }
    out.set(r.id, rec);
  }
  return out;
}
