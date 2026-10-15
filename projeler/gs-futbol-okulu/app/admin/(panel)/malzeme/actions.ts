"use server";

import { z } from "zod";
import { idSchema, invalid, runAdmin, type ActionResult } from "@/lib/admin-action";
import { writeAudit } from "@/lib/audit";
import { createOrder, deleteOrder, EquipmentError, itemSchema, listItems, markOrdered, orderSchema, saveItem, setItemActive, updateKitPayment, updateOrder, type OrderInput } from "@/lib/equipment";
import { DELIVERY_LABEL, shirtLabel, type Delivery } from "@/lib/equipment-shared";
import { formatMoney, PAYMENT_METHOD_LABELS } from "@/lib/billing-shared";
import { formatDateTr } from "@/lib/format";
import { getRegistration } from "@/lib/registrations";

const run = (scope: string, fn: Parameters<typeof runAdmin>[2]) => runAdmin("aidat.al", scope, fn, [EquipmentError]);
const who = (id: number) => getRegistration(id)?.studentFullName ?? `#${id}`;
const state = (d: string | null) => (d ? (DELIVERY_LABEL[d as Delivery] ?? d).toLocaleLowerCase("tr-TR") : "");

export async function saveOrderAction(orderId: number | null, registrationId: number, values: OrderInput): Promise<ActionResult> {
  if (!idSchema.safeParse(registrationId).success || (orderId !== null && !idSchema.safeParse(orderId).success)) return { ok: false, error: "Geçersiz istek." };
  const parsed = orderSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  return run("save equipment order", (actor) => {
    const o = orderId === null ? createOrder(registrationId, parsed.data, actor.id) : updateOrder(orderId, parsed.data, undefined, actor.id);
    const item = listItems(true).find((i) => i.id === o.itemId)?.name ?? `malzeme #${o.itemId}`;
    const sizes = [shirtLabel(o.size), o.sockSize ? `tozluk ${o.sockSize}` : null].filter(Boolean).join(", ");
    const socks = o.sockDelivery ? `; tozluk ${state(o.sockDelivery)}` : "";
    return {
      action: orderId === null ? "malzeme.ekle" : "malzeme.duzenle",
      entity: "registration",
      entityId: registrationId,
      summary: `${who(registrationId)}: ${item}${sizes ? ` (${sizes})` : ""}, ${o.owned ? "zaten var" : `${o.paid ? "ödendi" : "ödenmedi"}, ${state(o.delivery)}`}${socks}`,
    };
  });
}

/** Beden tablosundan: tedarikçiye sipariş verilen formalar ya da tozluklar tek seferde "sipariş verildi" olur. */
export async function markOrderedAction(orderIds: number[], part: "main" | "socks"): Promise<ActionResult & { count?: number }> {
  const ids = z.array(idSchema).max(500).safeParse(orderIds);
  if (!ids.success || (part !== "main" && part !== "socks")) return { ok: false, error: "Geçersiz istek." };
  let count = 0;
  const res = await run("mark kit ordered", (actor) => {
    const rows = markOrdered(ids.data, part);
    count = rows.length;
    for (const o of rows) writeAudit(actor, { action: "malzeme.siparis", entity: "registration", entityId: o.registrationId, summary: `${o.studentName}: ${part === "socks" ? "tozluk" : o.itemName} sipariş verildi` });
  });
  return res.ok ? { ...res, count } : res;
}

/** Kasa defterinden: alınmış forma parasının günü ve şekli düzeltilir. */
export async function updateKitPaymentAction(orderId: number, values: { method: string; paidOn: string }): Promise<ActionResult> {
  if (!idSchema.safeParse(orderId).success) return { ok: false, error: "Geçersiz kayıt." };
  const parsed = z.object({ method: z.enum(["cash", "eft"], { error: "Ödeme şeklini seçin." }), paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Tarih seçin." }) }).safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  return run("update kit payment", () => {
    const o = updateKitPayment(orderId, parsed.data);
    return {
      action: "malzeme.odeme-duzelt",
      entity: "registration",
      entityId: o.registrationId,
      summary: `${who(o.registrationId)}: malzeme parası düzeltildi (${formatMoney(o.priceKurus)}, ${PAYMENT_METHOD_LABELS[parsed.data.method]}, ${formatDateTr(parsed.data.paidOn)})`,
    };
  });
}

export async function deleteOrderAction(orderId: number, registrationId: number): Promise<ActionResult> {
  if (!idSchema.safeParse(orderId).success || !idSchema.safeParse(registrationId).success) return { ok: false, error: "Geçersiz istek." };
  return run("delete equipment order", () => {
    deleteOrder(orderId);
    return { action: "malzeme.sil", entity: "registration", entityId: registrationId, summary: `${who(registrationId)}: malzeme kaydı silindi` };
  });
}

export async function saveItemAction(id: number | null, values: { name: string; priceKurus: number }): Promise<ActionResult> {
  if (id !== null && !idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz ürün." };
  const parsed = itemSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  return run("save item", () => {
    const i = saveItem(id, parsed.data);
    return { action: "malzeme.urun", entity: "equipment_item", entityId: i.id, summary: `Ürün: ${i.name}` };
  });
}

export async function setItemActiveAction(id: number, active: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success || !z.boolean().safeParse(active).success) return { ok: false, error: "Geçersiz istek." };
  return run("item active", () => {
    setItemActive(id, active);
    return { action: "malzeme.urun-durum", entity: "equipment_item", entityId: id, summary: active ? "Ürün etkin" : "Ürün kullanım dışı" };
  });
}
