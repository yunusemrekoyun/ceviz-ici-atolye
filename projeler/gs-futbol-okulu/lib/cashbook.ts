import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { equipmentItems, equipmentOrders, registrations, users } from "@/lib/db/schema";
import { listPayments } from "@/lib/billing";
import { SESSIONS_PER_PACK, type PaymentMethod } from "@/lib/billing-shared";
import { cashTotals, groupByDay, type CashDay, type CashEntry, type CashTotals } from "@/lib/cashbook-shared";
import { shirtLabel } from "@/lib/equipment-shared";

export type { CashDay, CashEntry, CashTotals };

/**
 * Kasa defteri: gün gün alınan paralar (aidat makbuzları ve forma / malzeme). İptal edilen aidat listede
 * görünür ama toplamlara girmez. Client'a düz veri olarak gider; süzme ve gün toplamları orada yeniden hesaplanır.
 */

export function cashEntries(from: string, to: string): CashEntry[] {
  const fees: CashEntry[] = listPayments({ from, to, limit: -1 }).map((p) => ({
    key: `a-${p.id}`,
    kind: "aidat",
    id: p.id,
    registrationId: p.registrationId,
    studentName: p.studentFullName,
    studentNo: p.studentNo,
    day: p.paidOn,
    method: p.method as PaymentMethod,
    amountKurus: p.amountKurus,
    what: `${p.periodCount * SESSIONS_PER_PACK} antrenman`,
    receiptNo: p.receiptNo,
    takenBy: p.takenBy,
    note: p.note === "Kayıtta alındı" ? null : p.note,
    atEnrollment: p.note === "Kayıtta alındı",
    voided: Boolean(p.voidedAt),
    voidReason: p.voidReason,
    at: p.createdAt,
  }));
  const kit: CashEntry[] = getDb()
    .select({ o: equipmentOrders, item: equipmentItems.name, name: registrations.studentFullName, no: registrations.studentNo, userName: users.fullName, userLogin: users.username })
    .from(equipmentOrders)
    .innerJoin(equipmentItems, eq(equipmentOrders.itemId, equipmentItems.id))
    .innerJoin(registrations, eq(equipmentOrders.registrationId, registrations.id))
    .leftJoin(users, eq(equipmentOrders.paidBy, users.id))
    .where(and(eq(equipmentOrders.paid, true), gte(equipmentOrders.paidOn, from), lte(equipmentOrders.paidOn, to)))
    .all()
    .filter((r) => r.o.priceKurus > 0)
    .map((r) => ({
      key: `f-${r.o.id}`,
      kind: "forma",
      id: r.o.id,
      registrationId: r.o.registrationId,
      studentName: r.name,
      studentNo: r.no,
      day: r.o.paidOn!,
      method: (r.o.paidMethod === "eft" ? "eft" : "cash") as PaymentMethod,
      amountKurus: r.o.priceKurus,
      what: r.o.size ? `${r.item} · ${shirtLabel(r.o.size)}` : r.item,
      receiptNo: null,
      takenBy: r.userName?.trim() || r.userLogin || null,
      note: r.o.note,
      atEnrollment: false,
      voided: false,
      voidReason: null,
      at: r.o.updatedAt,
    }));
  return [...fees, ...kit].sort((a, b) => b.day.localeCompare(a.day) || b.at.localeCompare(a.at));
}

export type Cashbook = CashTotals & { from: string; to: string; days: CashDay[]; voidedCount: number };

export function cashbook(from: string, to: string): Cashbook {
  const entries = cashEntries(from, to);
  return { from, to, days: groupByDay(entries), voidedCount: entries.filter((e) => e.voided).length, ...cashTotals(entries) };
}
