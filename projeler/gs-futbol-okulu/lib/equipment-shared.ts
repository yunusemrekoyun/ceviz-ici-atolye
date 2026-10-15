/**
 * Forma ve malzeme: istemci ve sunucuda ortak (bağımlılık yok).
 * Forma takımında (forma + şort + tozluk) iki ölçü var: forma-şort bedeni (yaş aralığı "9-10" ya da harf "M") ve
 * tozluk numarası ("34-36"). Tozluk formadan ayrı teslim edilir; durumu forma kaydının altında tutulur.
 */

export const DELIVERY = ["waiting", "to_order", "ordered", "delivered"] as const;
export type Delivery = (typeof DELIVERY)[number];

export const DELIVERY_LABEL: Record<Delivery, string> = { waiting: "Teslim edilmedi", to_order: "Sipariş verilecek", ordered: "Sipariş verildi", delivered: "Teslim edildi" };

/** Forma (forma + şort + tozluk) her öğrencide zorunlu; eşofman isteğe bağlı. */
export const isFormaItem = (name: string) => /forma/i.test(name);

/** Forma takımında tozluk var mı: numarası ve teslimi ayrı izlenir. */
export const hasSocks = (name: string) => isFormaItem(name) && /tozluk|çorap/iu.test(name);

/**
 * Yeni kayıtta tozluğun teslimi (elle seçilmediyse): sipariş edilecek forma ile birlikte sipariş edilir; forma elden
 * verildiyse tozluk ayrıca "verildi" denmedikçe verilmemiş sayılır (unutulup verilmemiş görünmesin diye);
 * "zaten var"da hepsi kendisinde.
 */
export function defaultSockDelivery(delivery: Delivery, owned: boolean): Delivery {
  if (owned) return "delivered";
  return delivery === "delivered" ? "waiting" : delivery;
}

/* ---------------- Bedenler ---------------- */

/** Seçim düğmeleri. Listede olmayan bir beden "Başka" ile yazılabilir. */
export const SHIRT_AGES = ["4-5", "5-6", "6-7", "7-8", "8-9", "9-10", "10-11", "11-12", "12-13", "13-14", "14-15", "15-16"];
export const SHIRT_LETTERS = ["XS", "S", "M", "L", "XL", "XXL"];
export const SOCK_SIZES = ["26-28", "28-30", "30-32", "32-34", "34-36", "36-38", "38-40", "40-42", "42-44", "44-46"];

const LETTER_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL"];
const NUMERIC = /^(\d{1,2})(?:-(\d{1,2}))?$/;

/** "9-10" → "9-10 yaş"; harf ve diğerleri olduğu gibi. */
export function shirtLabel(size: string | null | undefined): string | null {
  if (!size) return null;
  const m = NUMERIC.exec(size);
  return m && Number(m[1]) < 20 ? `${size} yaş` : size;
}

/** Bedenleri küçükten büyüğe dizer: önce yaş / numara, sonra harf bedenler, en sonda diğerleri; boş en sonda. */
export function compareSizes(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const rank = (s: string): [number, number] => {
    const m = NUMERIC.exec(s);
    if (m) return [0, Number(m[1]) * 100 + Number(m[2] ?? m[1])];
    const i = LETTER_ORDER.indexOf(s.toUpperCase());
    return i >= 0 ? [1, i] : [2, 0];
  };
  const [ga, na] = rank(a);
  const [gb, nb] = rank(b);
  return ga - gb || na - nb || a.localeCompare(b, "tr");
}

export type KitSizes = { shirt: string | null; socks: string | null; rest: string | null };

// Beden metnindeki anlamsız sözcükler ve "belirlenecek" gibi bilinmiyor ifadeleri
const NOISE = /(^|[^\p{L}])(bedeni?|yaş|yas|yaşında|numara(?:sı)?|no|çorap|corap|tozluk|belirle\p{L}*|bilinmiyor)(?=$|[^\p{L}])/giu;
const LETTER = /(^|[^\p{L}\d])(xxs|xs|s|m|l|xl|xxl|2xl|3xl)(?=$|[^\p{L}\d])/giu;

/**
 * Tek alana yazılmış beden metnini ayırır: "9-10 Yaş 34-36" → forma 9-10, tozluk 34-36; "M Beden 40-42" → M, 40-42;
 * "36-38, 11-12 yaş" → 11-12, 36-38. 20'den küçük aralık yaş (forma-şort), büyüğü tozluk numarasıdır.
 * Anlaşılamayan kısım ("kaleci forması", "(K)") `rest` olarak döner.
 */
export function parseKitSizes(raw: string | null | undefined): KitSizes {
  let text = (raw ?? "").replace(/[–—]/g, "-").trim();
  let shirt: string | null = null;
  let socks: string | null = null;
  if (!text) return { shirt, socks, rest: null };
  text = text.replace(/(\d{1,2})\s*-\s*(\d{1,2})/g, (m, a: string, b: string) => {
    const lo = Number(a);
    const hi = Number(b);
    if (hi < 20 && !shirt) {
      shirt = `${lo}-${hi}`;
      return " ";
    }
    if (lo >= 20 && !socks) {
      socks = `${lo}-${hi}`;
      return " ";
    }
    return m;
  });
  text = text.replace(LETTER, (m, pre: string, s: string) => {
    if (shirt) return m;
    shirt = s.toUpperCase();
    return `${pre} `;
  });
  text = text.replace(/(^|\D)(\d{1,2})(?=\D|$)/g, (m, pre: string, n: string) => {
    const v = Number(n);
    if (v < 20 && !shirt) {
      shirt = String(v);
      return `${pre} `;
    }
    if (v >= 20 && !socks) {
      socks = String(v);
      return `${pre} `;
    }
    return m;
  });
  const rest = text
    .replace(NOISE, "$1")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;.\-/]+|[\s,;.\-/]+$/g, "")
    .trim();
  return { shirt, socks, rest: rest || null };
}

/** Seçilen ya da yazılan forma-şort bedenini saklanacak biçime getirir: "9-10 yaş" → "9-10", "m" → "M". */
export function normalizeShirt(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const p = parseKitSizes(raw);
  if (!p.shirt && !p.socks && !p.rest) return null;
  return p.shirt && !p.socks && !p.rest ? p.shirt : raw.slice(0, 20);
}

/** Tozluk numarası: "34 - 36" → "34-36". */
export function normalizeSock(input: string | null | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const p = parseKitSizes(raw);
  if (!p.shirt && !p.socks && !p.rest) return null;
  return p.socks && !p.shirt && !p.rest ? p.socks : raw.slice(0, 20);
}

/** Eline geçmemiş kalemin bedeni ya da tozluk numarası eksik mi (sipariş ve teslim için gerekli). */
export function sizeMissing(o: { delivery: string; size: string | null; sockDelivery: string | null; sockSize: string | null }): boolean {
  return (o.delivery !== "delivered" && !o.size) || (o.sockDelivery !== null && o.sockDelivery !== "delivered" && !o.sockSize);
}

/** Tozluğu henüz öğrenciye verilmedi. */
export const socksOpen = (o: { sockDelivery: string | null }) => o.sockDelivery !== null && o.sockDelivery !== "delivered";

/* ---------------- Beden tablosu ---------------- */

/** Beden tablosuna giren kayıt (lib/equipment OrderRow bunu karşılar). */
export type KitOrderLike = {
  id: number;
  registrationId: number;
  itemId: number;
  itemName: string;
  size: string | null;
  sockSize: string | null;
  delivery: string;
  sockDelivery: string | null;
  owned: boolean;
  paid: boolean;
  isGoalkeeper: boolean;
  studentName: string;
  studentNo: number | null;
  groupName: string | null;
};

/** Hangi kayıtlar sayılır: sipariş verilecek · eline geçmemiş (sipariş verilecek, verildi, okulda bekliyor) · hepsi. */
export type KitStage = "to_order" | "open" | "all";
export const KIT_STAGES: { key: KitStage; label: string; hint: string }[] = [
  { key: "to_order", label: "Sipariş verilecek", hint: "Tedarikçiye verilecek adetler. Sipariş verince “Hepsi sipariş verildi”ye dokunun." },
  { key: "open", label: "Teslim edilmedi", hint: "Öğrencinin eline henüz geçmeyenler: sipariş verilecek, sipariş verildi ya da okulda bekliyor." },
  { key: "all", label: "Tümü", hint: "Herkesin bedeni, teslim edilenler dahil." },
];

export function inStage(state: string | null, stage: KitStage): boolean {
  if (!state) return false;
  return stage === "all" || (stage === "to_order" ? state === "to_order" : state !== "delivered");
}

export type KitPart = "main" | "socks";
export type KitRow<T extends KitOrderLike = KitOrderLike> = { size: string | null; label: string; players: T[]; keepers: T[] };
export type KitTable<T extends KitOrderLike = KitOrderLike> = {
  key: string;
  itemId: number;
  part: KitPart;
  title: string;
  rows: KitRow<T>[];
  total: number;
  keepers: number;
  /** Bedeni / numarası girilmemiş adet. */
  missing: number;
  /** Tabloya giren kayıtlar (toplu işlem için). */
  orders: T[];
};

/** Ürün ürün beden tablosu: forma takımında forma-şort ve tozluk ayrı tablo; satırlar bedene göre, kaleci ayrı sayılır. */
export function kitTables<T extends KitOrderLike>(orders: T[], stage: KitStage): KitTable<T>[] {
  const items = new Map<number, string>();
  for (const o of [...orders].sort((a, b) => a.itemId - b.itemId)) items.set(o.itemId, o.itemName);
  const tables: KitTable<T>[] = [];
  for (const [itemId, name] of items) {
    const mine = orders.filter((o) => o.itemId === itemId);
    const parts: [KitPart, string, T[]][] = [["main", hasSocks(name) ? "Forma ve şort" : name, mine.filter((o) => inStage(o.delivery, stage))]];
    if (hasSocks(name)) parts.push(["socks", "Tozluk", mine.filter((o) => inStage(o.sockDelivery, stage))]);
    for (const [part, title, list] of parts) {
      if (list.length === 0) continue;
      const sizeOf = (o: T) => (part === "socks" ? o.sockSize : o.size);
      const bySize = new Map<string | null, KitRow<T>>();
      for (const o of list) {
        const size = sizeOf(o);
        const row = bySize.get(size) ?? { size, label: part === "socks" ? (size ?? "Numara yok") : (shirtLabel(size) ?? "Beden yok"), players: [], keepers: [] };
        (o.isGoalkeeper ? row.keepers : row.players).push(o);
        bySize.set(size, row);
      }
      const rows = [...bySize.values()].sort((a, b) => compareSizes(a.size, b.size));
      for (const r of rows) for (const l of [r.players, r.keepers]) l.sort((a, b) => a.studentName.localeCompare(b.studentName, "tr"));
      tables.push({ key: `${itemId}-${part}`, itemId, part, title, rows, total: list.length, keepers: list.filter((o) => o.isGoalkeeper).length, missing: list.filter((o) => !sizeOf(o)).length, orders: list });
    }
  }
  return tables;
}
