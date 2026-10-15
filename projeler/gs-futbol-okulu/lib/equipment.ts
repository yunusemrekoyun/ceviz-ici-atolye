import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { ageGroups, equipmentItems, equipmentOrders, registrations, type EquipmentItem, type EquipmentOrder } from "@/lib/db/schema";
import { defaultSockDelivery, DELIVERY, hasSocks, normalizeShirt, normalizeSock, type Delivery, type KitPart } from "@/lib/equipment-shared";

export { DELIVERY, type Delivery };

export class EquipmentError extends Error {}

export const itemSchema = z.object({
  name: z.string().trim().min(2, { error: "Ürün adını yazın." }).max(60),
  priceKurus: z.number().int().min(0).max(100_000_00),
});

export function listItems(includeInactive = false): EquipmentItem[] {
  const q = getDb().select().from(equipmentItems);
  return (includeInactive ? q : q.where(eq(equipmentItems.active, true))).orderBy(asc(equipmentItems.sort), asc(equipmentItems.name)).all();
}

export function saveItem(id: number | null, input: z.infer<typeof itemSchema>): EquipmentItem {
  const db = getDb();
  if (id === null) return db.insert(equipmentItems).values(input).returning().get();
  const row = db.update(equipmentItems).set(input).where(eq(equipmentItems.id, id)).returning().get();
  if (!row) throw new EquipmentError("Ürün bulunamadı.");
  return row;
}

export function setItemActive(id: number, active: boolean): void {
  getDb().update(equipmentItems).set({ active }).where(eq(equipmentItems.id, id)).run();
}

export type OrderRow = EquipmentOrder & {
  itemName: string;
  studentName: string;
  studentNo: number | null;
  studentStatus: string;
  /** Kalecinin forması ayrı sipariş edilir. */
  isGoalkeeper: boolean;
  groupId: number | null;
  groupName: string | null;
};

export function listOrders(): OrderRow[] {
  return getDb()
    .select({
      o: equipmentOrders,
      itemName: equipmentItems.name,
      studentName: registrations.studentFullName,
      studentNo: registrations.studentNo,
      studentStatus: registrations.status,
      isGoalkeeper: registrations.isGoalkeeper,
      groupId: registrations.groupId,
      groupName: ageGroups.name,
    })
    .from(equipmentOrders)
    .innerJoin(equipmentItems, eq(equipmentOrders.itemId, equipmentItems.id))
    .innerJoin(registrations, eq(equipmentOrders.registrationId, registrations.id))
    .leftJoin(ageGroups, eq(registrations.groupId, ageGroups.id))
    .orderBy(desc(equipmentOrders.createdAt))
    .all()
    .map((r) => ({ ...r.o, itemName: r.itemName, studentName: r.studentName, studentNo: r.studentNo, studentStatus: r.studentStatus, isGoalkeeper: r.isGoalkeeper, groupId: r.groupId, groupName: r.groupName }));
}

export const orderSchema = z.object({
  itemId: z.number().int().positive(),
  /** Forma-şort (ya da eşofman) bedeni; "9-10 yaş" → "9-10". */
  size: z
    .string()
    .trim()
    .max(20)
    .nullish()
    .transform((v) => normalizeShirt(v)),
  /** Tozluk numarası (tozluklu üründe). Verilmezse eskisi korunur. */
  sockSize: z
    .string()
    .trim()
    .max(20)
    .nullish()
    .transform((v) => (v === undefined ? undefined : normalizeSock(v))),
  /** Tozluğun teslimi. Verilmezse eskisi korunur; yeni kayıtta formanınkiyle aynı başlar. */
  sockDelivery: z.enum(DELIVERY).optional(),
  priceKurus: z.number().int().min(0).max(100_000_00),
  paid: z.boolean(),
  /** Parasının alındığı gün (boşsa bugün; zaten alınmışsa eski gün korunur). */
  paidOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  paidMethod: z.enum(["cash", "eft"]).nullish(),
  /** Öğrencinin kendisinde zaten var: ücret, ödeme ve teslim sorulmaz. */
  owned: z.boolean().optional(),
  delivery: z.enum(DELIVERY),
  note: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v || null),
});

export type OrderInput = Omit<z.infer<typeof orderSchema>, "sockSize" | "sockDelivery"> & { sockSize?: string | null; sockDelivery?: Delivery };

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

/** Öğrencinin bu üründen kaydı var mı (aynı malzeme iki kez yazılmasın). */
export function existingOrder(registrationId: number, itemId: number): boolean {
  return Boolean(getDb().select({ id: equipmentOrders.id }).from(equipmentOrders).where(and(eq(equipmentOrders.registrationId, registrationId), eq(equipmentOrders.itemId, itemId))).get());
}

/** "Zaten var" kaydının sabit alanları (satış değil). */
const OWNED = { owned: true, priceKurus: 0, paid: true, paidOn: null, paidMethod: null, paidBy: null, delivery: "delivered" } as const;

function checkPaidOn(paidOn: string | null | undefined, on: string): void {
  if (paidOn && paidOn > on) throw new EquipmentError("Ödeme günü ileri bir tarih olamaz.");
}

function itemOf(itemId: number): EquipmentItem {
  const item = getDb().select().from(equipmentItems).where(eq(equipmentItems.id, itemId)).get();
  if (!item) throw new EquipmentError("Ürün bulunamadı.");
  return item;
}

/**
 * Tozluk alanları: üründe tozluk yoksa boş. Teslim verilmezse eskisi, yeni kayıtta `defaultSockDelivery`;
 * teslim edildiği gün yazılır, geri alınınca silinir.
 */
function sockFields(item: EquipmentItem, input: { sockSize?: string | null; sockDelivery?: Delivery; delivery: Delivery; owned: boolean }, cur: EquipmentOrder | null, on: string) {
  if (!hasSocks(item.name)) return { sockSize: null, sockDelivery: null, sockDeliveredOn: null };
  const sockDelivery = input.sockDelivery ?? (cur?.sockDelivery as Delivery | null | undefined) ?? defaultSockDelivery(input.delivery, input.owned);
  const deliveredBefore = cur?.sockDelivery === "delivered" ? cur.sockDeliveredOn : null;
  return {
    sockSize: input.sockSize !== undefined ? normalizeSock(input.sockSize) : (cur?.sockSize ?? null),
    sockDelivery,
    sockDeliveredOn: sockDelivery === "delivered" ? (deliveredBefore ?? on) : null,
  };
}

export function createOrder(registrationId: number, input: OrderInput, userId: number | null, on: string = today()): EquipmentOrder {
  const db = getDb();
  if (!db.select({ id: registrations.id }).from(registrations).where(eq(registrations.id, registrationId)).get()) throw new EquipmentError("Öğrenci bulunamadı.");
  const item = itemOf(input.itemId);
  const { paidOn, paidMethod, owned, sockSize, sockDelivery, ...rest } = { ...input, size: normalizeShirt(input.size) };
  checkPaidOn(paidOn, today());
  const socks = sockFields(item, { sockSize, sockDelivery, delivery: rest.delivery, owned: Boolean(owned) }, null, on);
  if (owned) return db.insert(equipmentOrders).values({ registrationId, ...rest, ...OWNED, ...socks, deliveredOn: on, createdBy: userId }).returning().get();
  return db
    .insert(equipmentOrders)
    .values({
      registrationId,
      ...rest,
      ...socks,
      owned: false,
      paidOn: rest.paid ? (paidOn ?? on) : null,
      paidMethod: rest.paid ? (paidMethod ?? "cash") : null,
      paidBy: rest.paid ? userId : null,
      deliveredOn: rest.delivery === "delivered" ? on : null,
      createdBy: userId,
    })
    .returning()
    .get();
}

/** Kaydı günceller. Parası yeni alındıysa gün, şekil ve alan kişi yazılır; önceden alınmışsa (değiştirilmedikçe) korunur. */
export function updateOrder(id: number, input: OrderInput, on: string = today(), userId: number | null = null): EquipmentOrder {
  const db = getDb();
  const cur = db.select().from(equipmentOrders).where(eq(equipmentOrders.id, id)).get();
  if (!cur) throw new EquipmentError("Kayıt bulunamadı.");
  const item = itemOf(input.itemId);
  const { paidOn, paidMethod, owned, sockSize, sockDelivery, ...rest } = { ...input, size: normalizeShirt(input.size) };
  checkPaidOn(paidOn, today());
  // Başka ürüne geçildiyse tozluk bilgisi yeni ürüne göre baştan kurulur
  const socks = sockFields(item, { sockSize, sockDelivery, delivery: rest.delivery, owned: Boolean(owned) }, cur.itemId === input.itemId ? cur : null, on);
  if (owned)
    return db
      .update(equipmentOrders)
      .set({ ...rest, ...OWNED, ...socks, deliveredOn: cur.deliveredOn ?? on, updatedAt: new Date().toISOString() })
      .where(eq(equipmentOrders.id, id))
      .returning()
      .get();
  // "Zaten var"dan satışa dönüyorsa eski ödeme bilgisi yok sayılır
  const wasPaid = cur.paid && !cur.owned;
  return db
    .update(equipmentOrders)
    .set({
      ...rest,
      ...socks,
      owned: false,
      paidOn: rest.paid ? (paidOn ?? (wasPaid ? cur.paidOn : null) ?? on) : null,
      paidMethod: rest.paid ? (paidMethod ?? (wasPaid ? cur.paidMethod : null) ?? "cash") : null,
      paidBy: rest.paid ? (wasPaid ? cur.paidBy : userId) : null,
      deliveredOn: rest.delivery === "delivered" ? (cur.deliveredOn ?? on) : null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(equipmentOrders.id, id))
    .returning()
    .get();
}

/**
 * Toplu "sipariş verildi": tedarikçiye sipariş geçilince beden tablosundaki kayıtlar tek seferde işaretlenir.
 * Yalnız henüz sipariş verilmemiş (sipariş verilecek ya da okulda bekliyor) olanlar değişir. Değişen kayıtları döndürür.
 */
export function markOrdered(ids: number[], part: KitPart): OrderRow[] {
  const wanted = new Set(ids);
  const stateOf = (o: OrderRow) => (part === "socks" ? o.sockDelivery : o.delivery);
  const rows = listOrders().filter((o) => wanted.has(o.id) && (stateOf(o) === "to_order" || stateOf(o) === "waiting"));
  if (rows.length === 0) return [];
  const now = new Date().toISOString();
  getDb()
    .update(equipmentOrders)
    .set(part === "socks" ? { sockDelivery: "ordered", updatedAt: now } : { delivery: "ordered", updatedAt: now })
    .where(inArray(equipmentOrders.id, rows.map((o) => o.id)))
    .run();
  return rows;
}

/** Kasa defterinden düzeltme: alınmış forma parasının günü ve şekli. */
export function updateKitPayment(id: number, input: { method: "cash" | "eft"; paidOn: string }): EquipmentOrder {
  const db = getDb();
  const cur = db.select().from(equipmentOrders).where(eq(equipmentOrders.id, id)).get();
  if (!cur) throw new EquipmentError("Kayıt bulunamadı.");
  if (cur.owned) throw new EquipmentError("Bu malzeme öğrencinin kendisinde vardı; ödemesi yok.");
  if (!cur.paid) throw new EquipmentError("Bu malzemenin parası alınmamış.");
  checkPaidOn(input.paidOn, today());
  return db.update(equipmentOrders).set({ paidMethod: input.method, paidOn: input.paidOn, updatedAt: new Date().toISOString() }).where(eq(equipmentOrders.id, id)).returning().get();
}

export function deleteOrder(id: number): void {
  getDb().delete(equipmentOrders).where(eq(equipmentOrders.id, id)).run();
}
