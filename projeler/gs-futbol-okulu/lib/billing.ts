import { and, asc, desc, eq, inArray, isNull, like, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  accessOverrides,
  feePeriods,
  paymentClaims,
  payments,
  registrations,
  settings,
  users,
  type AccessOverride,
  type FeePeriod,
  type Payment,
  type PaymentClaim,
  type Registration,
} from "@/lib/db/schema";
import { addDaysTo, diffDays, parseDay } from "@/lib/dates";
import { clockNow, finishedOn, groupSessionDates, rightsStartDay, sessionsBetween, SESSIONS_PER_PACK, upcomingSessionDates } from "@/lib/training-rights";
import { istanbulDayKey } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { computeAccess, dayLabel, discountedFee, PROMISE_DEFAULT, type Access, type PaymentMethod } from "@/lib/billing-shared";

export class BillingError extends Error {}

export function todayKey(now: Date = new Date()): string {
  return istanbulDayKey(now);
}

/* ---------------- Dönem üretimi ---------------- */

function periodsOf(registrationId: number): FeePeriod[] {
  return getDb().select().from(feePeriods).where(eq(feePeriods.registrationId, registrationId)).orderBy(asc(feePeriods.startDate)).all();
}

/** Hakların sayılmaya başladığı gün: asıl kayıt (ya da geri dönüş) günü. */
function anchorOf(reg: Registration, today: string): string {
  return reg.billingAnchor ?? (reg.enrolledAt ? istanbulDayKey(reg.enrolledAt) : today);
}

/**
 * Öğrencinin hak paketlerini (dönem = grubun 8 antrenmanı) oluşturur ve tarihlerini güncel programa göre
 * yeniden hesaplar (idempotent). Paket k: başlangıç = k·8'inci antrenman günü (son ödeme günü de budur),
 * bitiş = bir sonraki paketin ilk antrenmanı, yani yenileme tarihi. İptal edilen antrenman hak yemediği için
 * program değişince tarihler kayar; ödenmiş/ödenmemiş durumu sırasıyla korunur.
 * İlk paket kayıt anında açılır: aidatı gelene 8 antrenman hakkı verilir. `minPacks` peşin ödemede ileri paket açar.
 * Ödenmemiş paket varken yenisi açılmaz: hakkı biten öğrencinin borcu birikmez, aidatı gelince hak yeniden başlar.
 */
export function ensurePeriods(reg: Registration, today: string, feeKurus: number, minPacks = 0): number {
  if (reg.status !== "enrolled" || feeKurus <= 0) return 0;
  const db = getDb();
  const amount = discountedFee(feeKurus, reg.discountPercent);
  const anchor = anchorOf(reg, today);
  const seq = periodsOf(reg.id).filter((p) => p.startDate >= anchor);
  const weeks = Math.max(0, Math.ceil(diffDays(today, anchor) / 7));
  const packs = Math.max(seq.length, minPacks, 1) + weeks + 2;
  const dates = groupSessionDates(reg.groupId, anchor, packs * SESSIONS_PER_PACK + 1);
  const startOf = (k: number) => dates[k * SESSIONS_PER_PACK] ?? null;
  const endOf = (k: number) => dates[(k + 1) * SESSIONS_PER_PACK] ?? (startOf(k) ? addDaysTo(startOf(k)!, 28) : null);

  let created = 0;
  // Var olan paketlerin tarihleri güncel programa göre (benzersizlik çakışmasın diye önce geçici değer).
  const moves = seq
    .map((p, k) => ({ p, start: startOf(k), end: endOf(k) }))
    .filter((m) => m.start && m.end && (m.p.startDate !== m.start || m.p.endDate !== m.end || m.p.dueDate !== m.start));
  if (moves.length) {
    for (const m of moves) db.update(feePeriods).set({ startDate: `~${m.p.id}` }).where(eq(feePeriods.id, m.p.id)).run();
    for (const m of moves) db.update(feePeriods).set({ startDate: m.start!, endDate: m.end!, dueDate: m.start! }).where(eq(feePeriods.id, m.p.id)).run();
  }
  // Yeni paketler: ilk paket her zaman; sonrakiler başlangıcı bugüne geldikçe ve önceki paket ödenmişse
  // (ya da peşin ödemede istenen sayıya kadar).
  let prevOpen = seq.at(-1)?.status === "open";
  for (let k = seq.length; ; k++) {
    const start = startOf(k);
    const end = endOf(k);
    if (!start || !end) break;
    if (k > 0 && k >= minPacks && (start > today || prevOpen)) break;
    const row = db.insert(feePeriods).values({ registrationId: reg.id, startDate: start, endDate: end, dueDate: start, amountKurus: amount }).onConflictDoNothing().returning().get();
    if (row) created++;
    prevOpen = true;
    if (k > 400) break;
  }
  return created;
}

/** Tüm kayıtlı öğrencilerin dönemlerini tamamlar (günlük iş ve aidat sayfası açılışı). */
export function ensureAllPeriods(today: string = todayKey()): number {
  const fee = getSettings().feeAmountKurus;
  if (fee <= 0) return 0;
  const enrolled = getDb().select().from(registrations).where(eq(registrations.status, "enrolled")).all();
  let total = 0;
  getDb().transaction(() => {
    for (const reg of enrolled) total += ensurePeriods(reg, today, fee);
  });
  return total;
}

const globalForBilling = globalThis as unknown as { __gsPeriodsEnsuredOn?: string; __gsPeriodsFee?: number };

/**
 * Gün içinde ilk okumada dönemleri tamamlar (günlük iş çalışmasa da durumlar doğru kalsın diye).
 * Aynı gün ve aynı tutarla ikinci çağrı hiçbir şey yapmaz.
 */
export function ensurePeriodsToday(): void {
  const today = todayKey();
  const fee = getSettings().feeAmountKurus;
  if (globalForBilling.__gsPeriodsEnsuredOn === today && globalForBilling.__gsPeriodsFee === fee) return;
  ensureAllPeriods(today);
  globalForBilling.__gsPeriodsEnsuredOn = today;
  globalForBilling.__gsPeriodsFee = fee;
}

/** Ayrılan öğrencinin henüz başlamamış, ödenmemiş dönemleri silinir (geçmiş borç kayıtta kalır). */
export function dropFuturePeriods(registrationId: number, today: string = todayKey()): void {
  getDb()
    .delete(feePeriods)
    .where(and(eq(feePeriods.registrationId, registrationId), eq(feePeriods.status, "open"), sql`${feePeriods.startDate} > ${today}`))
    .run();
}

/** Yeni kayıt / geri dönüş sonrası: bir sonraki okumada dönemler yeniden kontrol edilsin. */
export function invalidatePeriodCache(): void {
  globalForBilling.__gsPeriodsEnsuredOn = undefined;
}

/**
 * Güncel paketin bitişini (ilk hak dışı antrenman) `end` yapar. Çapa, grubun `end`den önceki 8. antrenmanı olur;
 * güncel ve sonraki paketler (peşin, ödenmemiş, kaldırılmış) oradan sırayla dizilir. Paket zincirde kaldığı için
 * sonradan iptal edilen antrenman hak yemez, yenileme kayar. Zincir kurulamazsa (yeterli antrenman günü yok ya da
 * eski bir paketle çakışıyor) güncel paketin bitişi `end`e sabitlenir. `reg` güncel grubuyla verilir.
 */
function setCurrentEnd(reg: Registration, current: FeePeriod, end: string, today: string, fee: number): void {
  const db = getDb();
  const all = periodsOf(reg.id);
  const later = all.filter((p) => p.id !== current.id && p.startDate > current.startDate);
  const dates = groupSessionDates(reg.groupId, addDaysTo(end, -400), 5000);
  const at = dates.indexOf(end);
  const start = at >= SESSIONS_PER_PACK ? dates[at - SESSIONS_PER_PACK]! : null;
  const chain = start !== null && !all.some((p) => p.id !== current.id && p.startDate < current.startDate && p.startDate >= start);
  // Benzersizlik çakışmasın diye geçici başlangıç; ensurePeriods sırayla gerçek tarihleri verir
  (chain ? [current, ...later] : later).forEach((p, i) => db.update(feePeriods).set({ startDate: `~${String(i).padStart(4, "0")}` }).where(eq(feePeriods.id, p.id)).run());
  if (!chain) db.update(feePeriods).set({ endDate: end }).where(eq(feePeriods.id, current.id)).run();
  const updated = db
    .update(registrations)
    .set({ billingAnchor: chain ? start : end, updatedAt: new Date().toISOString() })
    .where(eq(registrations.id, reg.id))
    .returning()
    .get();
  ensurePeriods(updated, today, fee);
}

/**
 * Öğrencinin grubunu değiştirir; hak paketleri geriye dönük yeni grubun günlerinden yeniden sayılmaz.
 * Geçmiş paketler olduğu gibi kalır. Ödenmiş güncel pakette eski grupta kullanılan antrenmanlar düşülür, kalan
 * hak bugünden itibaren yeni grubun günlerinden sayılır (yenileme tarihi buna göre değişir); sonraki paketler
 * oradan dizilir. Ödenmemiş güncel paket başlangıcından (ödeme gününden) itibaren yeni gruba göre sayılır.
 */
export function changeGroupKeepingRights(registrationId: number, newGroupId: number | null, today: string = todayKey()): void {
  const db = getDb();
  db.transaction(() => {
    const reg = db.select().from(registrations).where(eq(registrations.id, registrationId)).get();
    if (!reg) throw new BillingError("Kayıt bulunamadı.");
    if (reg.groupId === newGroupId) return;
    const fee = getSettings().feeAmountKurus;
    let anchor: string | null = null;
    let paidEnd: { current: FeePeriod; end: string } | null = null;
    if (reg.status === "enrolled" && fee > 0) {
      ensurePeriods(reg, today, fee);
      const all = periodsOf(reg.id).filter((p) => p.status !== "void");
      const current = all.filter((p) => p.startDate <= today).at(-1);
      if (!current) {
        // Henüz paket başlamadı: hak bugünden sayılır
        if (anchorOf(reg, today) < today) anchor = today;
      } else if (current.status !== "paid") {
        anchor = current.startDate;
      } else {
        const used = groupSessionDates(reg.groupId, current.startDate, SESSIONS_PER_PACK).filter((d) => d < today).length;
        const end = used < SESSIONS_PER_PACK && current.endDate > today ? (groupSessionDates(newGroupId, today, SESSIONS_PER_PACK + 1)[SESSIONS_PER_PACK - used] ?? current.endDate) : current.endDate;
        paidEnd = { current, end };
      }
    }
    const updated = db
      .update(registrations)
      .set({ groupId: newGroupId, ...(anchor ? { billingAnchor: anchor } : {}), updatedAt: new Date().toISOString() })
      .where(eq(registrations.id, reg.id))
      .returning()
      .get();
    // Ödenmiş güncel paket yeni grubun günleriyle zincirde kalır (sonraki paketler yeni yenilemeden dizilir)
    if (paidEnd) setCurrentEnd(updated, paidEnd.current, paidEnd.end, today, fee);
    else if (reg.status === "enrolled" && fee > 0) ensurePeriods(updated, today, fee);
  });
  invalidatePeriodCache();
}

/**
 * Elle hak girişi (kağıttaki kayıttan): öğrencinin henüz yapılmamış antrenmanlardan kalan hakkı `left` olur.
 * Güncel ödenmiş paketin bitişi (sonraki ödeme günü) buna göre kayar; sonraki paketler (peşin ödenmiş ya da
 * ödenmemiş) yeni yenilemeden dizilir. Geçmiş paketlere ve ödemelere dokunulmaz. Ödemesi olmayan öğrencide
 * yapılamaz: önce aidat alınır. Peşin ödenmiş her aidat 8 hak demektir, kalan hak bunun altına inemez.
 */
export function setSessionsLeft(registrationId: number, left: number, now: Date = new Date()): { before: number | null; after: number; paidUntil: string } {
  const today = todayKey(now);
  const db = getDb();
  const result = db.transaction(() => {
    const reg = db.select().from(registrations).where(eq(registrations.id, registrationId)).get();
    if (!reg) throw new BillingError("Kayıt bulunamadı.");
    if (reg.status !== "enrolled") throw new BillingError("Yalnız kayıtlı öğrencinin hakkı girilir.");
    const fee = getSettings().feeAmountKurus;
    if (fee <= 0) throw new BillingError("Önce Ayarlar'dan aidat tutarını girin.");
    if (!Number.isInteger(left) || left < 0) throw new BillingError("Kalan hak 0 ya da daha büyük bir sayı olmalı.");
    ensurePeriods(reg, today, fee);
    const live = periodsOf(reg.id).filter((p) => p.status !== "void");
    const paid = live.filter((p) => p.status === "paid");
    if (!paid.length) throw new BillingError("Bu öğrencinin ödemesi yok. Önce aidatını alın, sonra kalan hakkını girin.");
    const current = paid.filter((p) => p.startDate <= today).at(-1) ?? paid[0]!;
    const ahead = paid.filter((p) => p.startDate > current.startDate).length;
    const inCurrent = left - ahead * SESSIONS_PER_PACK;
    if (inCurrent < 0) throw new BillingError(`Peşin ödenmiş ${ahead} aidatı var; kalan hak en az ${ahead * SESSIONS_PER_PACK} olabilir. Fazla girilen ödeme varsa önce onu iptal edin.`);
    if (inCurrent > SESSIONS_PER_PACK) throw new BillingError(`Ödediği aidatlarla en fazla ${(ahead + 1) * SESSIONS_PER_PACK} hak olabilir. Daha fazlası için aidat alın.`);

    const before = accessOf(reg, today, now);
    const from = current.startDate > today ? current.startDate : today;
    const end = upcomingSessionDates(reg.groupId, from, inCurrent + 1, now)[inCurrent];
    if (!end || end <= current.startDate) throw new BillingError("Grubun antrenman günleri bulunamadı; önce grubun programını girin.");
    setCurrentEnd(reg, current, end, today, fee);
    const after = accessOf(reg, today, now);
    return { before: before.state === "paid" ? (before.sessionsLeft ?? null) : 0, after: left, paidUntil: after.paidUntil ?? end };
  });
  invalidatePeriodCache();
  return result;
}

/** Hak girişi ekranı için: ödemesi var mı, peşin kaç aidatı var (kalan hakkın alt sınırı), son ödeme günü. */
export function rightsInfo(ids: number[], today: string = todayKey()): Map<number, { hasPaid: boolean; ahead: number; lastPaidOn: string | null }> {
  const out = new Map<number, { hasPaid: boolean; ahead: number; lastPaidOn: string | null }>();
  if (!ids.length) return out;
  const periods = allPeriodsFor(ids).filter((p) => p.status === "paid");
  const paidOn = getDb()
    .select({ registrationId: payments.registrationId, paidOn: sql<string>`max(${payments.paidOn})` })
    .from(payments)
    .where(and(inArray(payments.registrationId, ids), isNull(payments.voidedAt)))
    .groupBy(payments.registrationId)
    .all();
  for (const id of ids) {
    const paid = periods.filter((p) => p.registrationId === id);
    const current = paid.filter((p) => p.startDate <= today).at(-1) ?? paid[0];
    out.set(id, {
      hasPaid: paid.length > 0,
      ahead: current ? paid.filter((p) => p.startDate > current.startDate).length : 0,
      lastPaidOn: paidOn.find((r) => r.registrationId === id)?.paidOn ?? null,
    });
  }
  return out;
}

/* ---------------- Erişim ---------------- */

function overridesOf(ids: number[]): AccessOverride[] {
  if (ids.length === 0) return [];
  return getDb().select().from(accessOverrides).where(inArray(accessOverrides.registrationId, ids)).orderBy(desc(accessOverrides.id)).all();
}

function allPeriodsFor(ids: number[]): FeePeriod[] {
  if (ids.length === 0) return [];
  return getDb().select().from(feePeriods).where(inArray(feePeriods.registrationId, ids)).orderBy(asc(feePeriods.startDate)).all();
}

/** Birden çok öğrenci için erişim durumu (tek sorguda). */
export function accessMap(regs: (Pick<Registration, "id" | "status"> & { groupId?: number | null })[], today: string = todayKey(), now: Date = new Date()): Map<number, Access> {
  const ids = regs.map((r) => r.id);
  const periods = allPeriodsFor(ids);
  const overrides = overridesOf(ids);
  const graceDays = getSettings().graceDays;
  const clock = clockNow(now);
  const out = new Map<number, Access>();
  for (const reg of regs) {
    const access = computeAccess({
      enrolled: reg.status === "enrolled",
      periods: periods.filter((p) => p.registrationId === reg.id),
      overrides: overrides.filter((o) => o.registrationId === reg.id),
      today,
      graceDays,
    });
    // Grubu bilinen öğrencide yenilemeye kadar kalan antrenman sayısı (bugün saati geçmiş antrenmanın hakkı düşmüş sayılır)
    if (access.state === "paid" && access.paidUntil && "groupId" in reg) {
      const left = sessionsBetween(reg.groupId ?? null, today, access.paidUntil);
      access.sessionsLeft = left > 0 && today === clock.day ? Math.max(0, left - finishedOn(reg.groupId ?? null, today, clock.time)) : left;
    }
    out.set(reg.id, access);
  }
  return out;
}

export function accessOf(reg: Pick<Registration, "id" | "status"> & { groupId?: number | null }, today: string = todayKey(), now: Date = new Date()): Access {
  return accessMap([reg], today, now).get(reg.id)!;
}

/* ---------------- Ödeme ---------------- */

/**
 * Yılın sıradaki makbuz numarası. Numara bir kez verilir, hiç yeniden kullanılmaz: verilen en büyük numara
 * ayarlarda saklanır (iptal edilmiş ödeme, silinen deneme kaydıyla birlikte silinse bile sıra geri gitmez).
 * Ödeme işleminin içinde çağrılır; ödeme yazılamazsa sayaç da geri alınır.
 */
function nextReceiptNo(paidOn: string): string {
  const year = parseDay(paidOn).y;
  const db = getDb();
  const key = `receipt_seq:${year}`;
  const stored = Number(db.select({ value: settings.value }).from(settings).where(eq(settings.key, key)).get()?.value ?? 0) || 0;
  const row = db
    .select({ value: sql<number | null>`max(cast(substr(${payments.receiptNo}, 6) as integer))` })
    .from(payments)
    .where(like(payments.receiptNo, `${year}-%`))
    .get();
  const next = Math.max(stored, row?.value ?? 0) + 1;
  db.insert(settings).values({ key, value: String(next) }).onConflictDoUpdate({ target: settings.key, set: { value: String(next) } }).run();
  return `${year}-${String(next).padStart(4, "0")}`;
}

export type PaymentInput = {
  periodCount: number;
  method: PaymentMethod;
  paidOn: string;
  note: string | null;
  fileId?: number | null;
  claimId?: number | null;
  /** Hak bu günden (sonraki ilk antrenmandan) yeniden başlar; boşsa kaldığı paketten devam eder. */
  startFrom?: string | null;
};

/**
 * Hakkı `day` gününden yeniden başlatır (ara verip dönen öğrenci ya da geriye dönük girilen ilk ödeme).
 * Önceki ödenmemiş paketler "kullanılmadı" diye kaldırılır (hiç ödemesi yoksa silinir); hakkı süren öğrencide yapılamaz.
 */
function restartRights(reg: Registration, from: string): Registration {
  const db = getDb();
  // Ödeme o günün antrenmanından sonra alındıysa hak ertesi günden başlar
  const day = rightsStartDay(reg.groupId, from);
  const all = periodsOf(reg.id);
  const paidEnd = all.filter((p) => p.status === "paid").reduce<string | null>((max, p) => (!max || p.endDate > max ? p.endDate : max), null);
  if (paidEnd && paidEnd > day) throw new BillingError(`Hakkı ${dayLabel(paidEnd, false)} yenilemesine kadar sürüyor; yeni hak bu tarihten önce başlatılamaz.`);
  const hadPaid = Boolean(paidEnd);
  for (const p of all) {
    if (p.status === "paid") continue;
    if (!hadPaid || p.startDate >= day) db.delete(feePeriods).where(eq(feePeriods.id, p.id)).run();
    else if (p.status === "open") db.update(feePeriods).set({ status: "void", note: "Ara: hak kullanılmadı" }).where(eq(feePeriods.id, p.id)).run();
  }
  return db.update(registrations).set({ billingAnchor: day }).where(eq(registrations.id, reg.id)).returning().get();
}

/**
 * Ödeme kaydı: en eski ödenmemiş dönemden başlayarak `periodCount` dönemi kapatır.
 * Peşin ödemede gelecek dönemler oluşturulur. Tutar dönemlerin toplamıdır (indirim yok).
 */
export function recordPayment(registrationId: number, input: PaymentInput, userId: number | null, today: string = todayKey()): Payment {
  const db = getDb();
  return db.transaction(() => {
    let reg = db.select().from(registrations).where(eq(registrations.id, registrationId)).get();
    if (!reg) throw new BillingError("Kayıt bulunamadı.");
    if (reg.status !== "enrolled") throw new BillingError("Yalnız kayıtlı öğrenciden ödeme alınır.");
    const fee = getSettings().feeAmountKurus;
    if (fee <= 0) throw new BillingError("Önce Ayarlar'dan 8 antrenmanlık aidat tutarını girin.");
    if (input.startFrom) reg = restartRights(reg, input.startFrom);
    ensurePeriods(reg, today, fee);
    let open = periodsOf(reg.id).filter((p) => p.status === "open");
    if (open.length < input.periodCount) {
      // Peşin ödeme: sıradaki paketler açılır (tarihleri grubun antrenman günlerinden).
      const anchor = anchorOf(reg, today);
      const packs = periodsOf(reg.id).filter((p) => p.startDate >= anchor).length;
      ensurePeriods(reg, today, fee, packs + input.periodCount - open.length);
      open = periodsOf(reg.id).filter((p) => p.status === "open");
      if (open.length < input.periodCount) throw new BillingError("Grubun antrenman takvimi bulunamadı; paket açılamadı.");
    }
    const chosen = open.slice(0, input.periodCount);
    const payment = db
      .insert(payments)
      .values({
        registrationId: reg.id,
        receiptNo: nextReceiptNo(input.paidOn),
        amountKurus: chosen.reduce((s, p) => s + p.amountKurus, 0),
        method: input.method,
        paidOn: input.paidOn,
        periodCount: chosen.length,
        note: input.note,
        fileId: input.fileId ?? null,
        claimId: input.claimId ?? null,
        createdBy: userId,
      })
      .returning()
      .get();
    db.update(feePeriods)
      .set({ status: "paid", paymentId: payment.id })
      .where(inArray(feePeriods.id, chosen.map((p) => p.id)))
      .run();
    // Ödeme geldi: açık ödeme sözü tutulmuş sayılır.
    db.update(accessOverrides)
      .set({ fulfilledAt: new Date().toISOString() })
      .where(and(eq(accessOverrides.registrationId, reg.id), isNull(accessOverrides.revokedAt), isNull(accessOverrides.fulfilledAt)))
      .run();
    return payment;
  });
}

export type PaymentPlan = { from: string; until: string };
export type PaymentPlans = {
  /** Kaldığı paketten devam (hiç ödemesi yoksa kayıttan sonraki ilk antrenmandan). */
  chain: PaymentPlan | null;
  /** Ödeme tarihinden sonraki ilk antrenmandan yeniden başlatma; yapılamıyorsa ya da aynıysa boş. */
  restart: PaymentPlan | null;
  suggested: "chain" | "restart";
  hadPaid: boolean;
  error?: string;
};

class Rollback extends Error {
  constructor(readonly plan: PaymentPlan) {
    super("rollback");
  }
}

/** Ödemenin kapsayacağı antrenmanlar: ödeme yazılıp okunur, sonra geri alınır (veritabanında iz kalmaz). */
function simulatePayment(registrationId: number, input: PaymentInput, today: string): PaymentPlan {
  try {
    getDb().transaction(() => {
      const p = recordPayment(registrationId, input, null, today);
      const covered = periodsForPayment(p.id);
      throw new Rollback({ from: covered[0]!.startDate, until: covered.at(-1)!.endDate });
    });
  } catch (err) {
    if (err instanceof Rollback) return err.plan;
    throw err;
  }
  throw new BillingError("Ödeme önizlenemedi.");
}

/** Ödeme penceresi için: bu ödeme hangi antrenmanlardan başlar, yenileme ne zaman olur (iki seçenekle). */
export function paymentPlans(registrationId: number, periodCount: number, paidOn: string, today: string = todayKey()): PaymentPlans {
  const base = { periodCount, method: "cash" as const, paidOn, note: null };
  const hadPaid = periodsOf(registrationId).some((p) => p.status === "paid");
  let chain: PaymentPlan | null = null;
  let restart: PaymentPlan | null = null;
  let error: string | undefined;
  try {
    chain = simulatePayment(registrationId, base, today);
  } catch (err) {
    if (!(err instanceof BillingError)) throw err;
    error = err.message;
  }
  try {
    restart = simulatePayment(registrationId, { ...base, startFrom: paidOn }, today);
  } catch (err) {
    if (!(err instanceof BillingError)) throw err;
  }
  if (restart && chain && restart.from === chain.from) restart = null;
  let suggested: PaymentPlans["suggested"] = "chain";
  if (restart && chain) {
    if (!hadPaid) suggested = restart.from < chain.from ? "restart" : "chain";
    else {
      // Hakkı bitip toleransı da geçmişse ara vermiş sayılır: hak ödemeyle yeniden başlar.
      const oldestOpen = periodsOf(registrationId).find((p) => p.status === "open" && p.startDate <= paidOn);
      const lapsed = oldestOpen ? addDaysTo(oldestOpen.dueDate, getSettings().graceDays) <= paidOn : false;
      suggested = lapsed || chain.until <= paidOn ? "restart" : "chain";
    }
  } else if (restart) suggested = "restart";
  return { chain, restart, suggested, hadPaid, ...(chain || restart ? {} : { error: error ?? "Ödeme önizlenemedi." }) };
}

export function voidPayment(paymentId: number, reason: string, userId: number): Payment {
  const db = getDb();
  return db.transaction(() => {
    const payment = db.select().from(payments).where(eq(payments.id, paymentId)).get();
    if (!payment) throw new BillingError("Ödeme bulunamadı.");
    if (payment.voidedAt) throw new BillingError("Bu ödeme zaten iptal edilmiş.");
    db.update(feePeriods).set({ status: "open", paymentId: null }).where(eq(feePeriods.paymentId, paymentId)).run();
    return db
      .update(payments)
      .set({ voidedAt: new Date().toISOString(), voidedBy: userId, voidReason: reason })
      .where(eq(payments.id, paymentId))
      .returning()
      .get();
  });
}

/** Hatalı açılmış dönemi kaldırır (gerekçeli). Ödenmiş dönem kaldırılamaz; önce ödeme iptal edilir. */
export function voidPeriod(periodId: number, reason: string): FeePeriod {
  const db = getDb();
  const period = db.select().from(feePeriods).where(eq(feePeriods.id, periodId)).get();
  if (!period) throw new BillingError("Dönem bulunamadı.");
  if (period.status !== "open") throw new BillingError("Yalnız ödenmemiş dönem kaldırılabilir.");
  return db.update(feePeriods).set({ status: "void", note: reason }).where(eq(feePeriods.id, periodId)).returning().get();
}

export function getPayment(id: number): (Payment & { studentFullName: string; studentNo: number | null }) | null {
  const row = getDb()
    .select({ p: payments, name: registrations.studentFullName, no: registrations.studentNo })
    .from(payments)
    .innerJoin(registrations, eq(payments.registrationId, registrations.id))
    .where(eq(payments.id, id))
    .get();
  return row ? { ...row.p, studentFullName: row.name, studentNo: row.no } : null;
}

export function periodsForPayment(paymentId: number): FeePeriod[] {
  return getDb().select().from(feePeriods).where(eq(feePeriods.paymentId, paymentId)).orderBy(asc(feePeriods.startDate)).all();
}

/** Öğrencilerin son aidat ödemesi (iptal edilmeyen): gün, yöntem, tutar. Listelerde "ne zaman, nasıl ödedi". */
export function lastPayments(ids: number[]): Map<number, { paidOn: string; method: PaymentMethod; amountKurus: number }> {
  const out = new Map<number, { paidOn: string; method: PaymentMethod; amountKurus: number }>();
  if (!ids.length) return out;
  const rows = getDb()
    .select({ r: payments.registrationId, paidOn: payments.paidOn, method: payments.method, amount: payments.amountKurus })
    .from(payments)
    .where(and(inArray(payments.registrationId, ids), isNull(payments.voidedAt)))
    .orderBy(desc(payments.paidOn), desc(payments.id))
    .all();
  for (const p of rows) if (!out.has(p.r)) out.set(p.r, { paidOn: p.paidOn, method: p.method as PaymentMethod, amountKurus: p.amount });
  return out;
}

export type PaymentRow = Payment & { studentFullName: string; studentNo: number | null; /** Parayı alan (kaydeden) kullanıcı. */ takenBy: string | null };

export function listPayments(options: { from?: string; to?: string; registrationId?: number; limit?: number } = {}): PaymentRow[] {
  const conds = [];
  if (options.from) conds.push(sql`${payments.paidOn} >= ${options.from}`);
  if (options.to) conds.push(sql`${payments.paidOn} <= ${options.to}`);
  if (options.registrationId) conds.push(eq(payments.registrationId, options.registrationId));
  return getDb()
    .select({ p: payments, name: registrations.studentFullName, no: registrations.studentNo, userName: users.fullName, userLogin: users.username })
    .from(payments)
    .innerJoin(registrations, eq(payments.registrationId, registrations.id))
    .leftJoin(users, eq(payments.createdBy, users.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(payments.paidOn), desc(payments.id))
    .limit(options.limit ?? 500)
    .all()
    .map((r) => ({ ...r.p, studentFullName: r.name, studentNo: r.no, takenBy: r.userName?.trim() || r.userLogin || null }));
}

/**
 * Yanlış girilen ödemenin şekli, günü ya da notu düzeltilir; tutar, makbuz no ve antrenman hakkı tarihleri değişmez
 * (onlar için ödeme iptal edilip yeniden alınır).
 */
export function updatePayment(paymentId: number, input: { method: PaymentMethod; paidOn: string; note: string | null }, today: string = todayKey()): { before: Payment; after: Payment } {
  const db = getDb();
  const before = db.select().from(payments).where(eq(payments.id, paymentId)).get();
  if (!before) throw new BillingError("Ödeme bulunamadı.");
  if (before.voidedAt) throw new BillingError("İptal edilmiş ödeme düzeltilemez.");
  if (input.paidOn > today) throw new BillingError("Ödeme tarihi ileri bir gün olamaz.");
  const after = db.update(payments).set({ method: input.method, paidOn: input.paidOn, note: input.note }).where(eq(payments.id, paymentId)).returning().get();
  return { before, after };
}

/* ---------------- Veli bildirimleri (ödeme yaptım) ---------------- */

export type ClaimRow = PaymentClaim & { studentFullName: string; studentNo: number | null };

export function listClaims(status: "pending" | "all" = "pending", limit = 100): ClaimRow[] {
  return getDb()
    .select({ c: paymentClaims, name: registrations.studentFullName, no: registrations.studentNo })
    .from(paymentClaims)
    .innerJoin(registrations, eq(paymentClaims.registrationId, registrations.id))
    .where(status === "pending" ? eq(paymentClaims.status, "pending") : undefined)
    .orderBy(desc(paymentClaims.createdAt), desc(paymentClaims.id))
    .limit(limit)
    .all()
    .map((r) => ({ ...r.c, studentFullName: r.name, studentNo: r.no }));
}

export function countPendingClaims(): number {
  return getDb().select({ value: sql<number>`count(*)` }).from(paymentClaims).where(eq(paymentClaims.status, "pending")).get()?.value ?? 0;
}

export function latestClaim(registrationId: number): PaymentClaim | null {
  return getDb().select().from(paymentClaims).where(eq(paymentClaims.registrationId, registrationId)).orderBy(desc(paymentClaims.id)).get() ?? null;
}

export function createClaim(input: { registrationId: number; userId: number; method: PaymentMethod; fileId: number | null; note: string | null }): PaymentClaim {
  const db = getDb();
  const pending = db
    .select({ id: paymentClaims.id })
    .from(paymentClaims)
    .where(and(eq(paymentClaims.registrationId, input.registrationId), eq(paymentClaims.status, "pending")))
    .get();
  if (pending) throw new BillingError("Bu öğrenci için bekleyen bir bildiriminiz var. Onaylanınca haber vereceğiz.");
  return db.insert(paymentClaims).values(input).returning().get();
}

export function getClaim(id: number): PaymentClaim | null {
  return getDb().select().from(paymentClaims).where(eq(paymentClaims.id, id)).get() ?? null;
}

export function approveClaim(claimId: number, periodCount: number, userId: number, today: string = todayKey()): { claim: PaymentClaim; payment: Payment } {
  const db = getDb();
  return db.transaction(() => {
    const claim = getClaim(claimId);
    if (!claim) throw new BillingError("Bildirim bulunamadı.");
    if (claim.status !== "pending") throw new BillingError("Bu bildirim zaten sonuçlandırılmış.");
    const payment = recordPayment(
      claim.registrationId,
      { periodCount, method: claim.method as PaymentMethod, paidOn: istanbulDayKey(claim.createdAt), note: claim.note, fileId: claim.fileId, claimId: claim.id },
      userId,
      today,
    );
    const updated = db
      .update(paymentClaims)
      .set({ status: "approved", decidedBy: userId, decidedAt: new Date().toISOString(), paymentId: payment.id })
      .where(eq(paymentClaims.id, claimId))
      .returning()
      .get();
    return { claim: updated, payment };
  });
}

export function rejectClaim(claimId: number, reason: string, userId: number): PaymentClaim {
  const claim = getClaim(claimId);
  if (!claim) throw new BillingError("Bildirim bulunamadı.");
  if (claim.status !== "pending") throw new BillingError("Bu bildirim zaten sonuçlandırılmış.");
  return getDb()
    .update(paymentClaims)
    .set({ status: "rejected", decidedBy: userId, decidedAt: new Date().toISOString(), rejectReason: reason })
    .where(eq(paymentClaims.id, claimId))
    .returning()
    .get();
}

/* ---------------- Ödeme sözü ---------------- */

export const MAX_OVERRIDE_DAYS = 31;

/**
 * Ödeme sözü: veli "şu gün ödeyeceğim" dedi. Söz günü dahil antrenman hakkı sürer; ödeme gelince söz kapanır,
 * gelmezse "ödeyecekti, gelmedi" görünür ve hak kapanır. Öğrencinin tek açık sözü olur (yenisi eskisinin yerine geçer).
 */
export function createOverride(input: { registrationId: number; reason: string | null; endsOn: string; userId: number }, today: string = todayKey()): AccessOverride {
  if (input.endsOn < today) throw new BillingError("Ödeme günü bugünden önce olamaz.");
  if (input.endsOn > addDaysTo(today, MAX_OVERRIDE_DAYS)) throw new BillingError(`Ödeme günü en fazla ${MAX_OVERRIDE_DAYS} gün sonrası olabilir.`);
  const db = getDb();
  const reg = db.select({ status: registrations.status }).from(registrations).where(eq(registrations.id, input.registrationId)).get();
  if (!reg) throw new BillingError("Kayıt bulunamadı.");
  if (reg.status !== "enrolled") throw new BillingError("Yalnız kayıtlı öğrenci için girilebilir.");
  db.update(accessOverrides)
    .set({ revokedAt: new Date().toISOString(), revokedBy: input.userId })
    .where(and(eq(accessOverrides.registrationId, input.registrationId), isNull(accessOverrides.revokedAt), isNull(accessOverrides.fulfilledAt)))
    .run();
  return db
    .insert(accessOverrides)
    .values({ registrationId: input.registrationId, reason: input.reason?.trim() || PROMISE_DEFAULT, startsOn: today, endsOn: input.endsOn, createdBy: input.userId })
    .returning()
    .get();
}

export function revokeOverride(id: number, userId: number): AccessOverride {
  const row = getDb()
    .update(accessOverrides)
    .set({ revokedAt: new Date().toISOString(), revokedBy: userId })
    .where(and(eq(accessOverrides.id, id), isNull(accessOverrides.revokedAt)))
    .returning()
    .get();
  if (!row) throw new BillingError("Ödeme sözü bulunamadı ya da zaten kapanmış.");
  return row;
}

/* ---------------- Öğrenci aidat özeti ---------------- */

export type BillingDetail = {
  periods: FeePeriod[];
  payments: Payment[];
  overrides: AccessOverride[];
  claims: PaymentClaim[];
};

export function billingDetail(registrationId: number): BillingDetail {
  const db = getDb();
  return {
    periods: db.select().from(feePeriods).where(eq(feePeriods.registrationId, registrationId)).orderBy(desc(feePeriods.startDate)).all(),
    payments: db.select().from(payments).where(eq(payments.registrationId, registrationId)).orderBy(desc(payments.paidOn), desc(payments.id)).all(),
    overrides: db.select().from(accessOverrides).where(eq(accessOverrides.registrationId, registrationId)).orderBy(desc(accessOverrides.id)).limit(10).all(),
    claims: db.select().from(paymentClaims).where(eq(paymentClaims.registrationId, registrationId)).orderBy(desc(paymentClaims.id)).limit(10).all(),
  };
}

/**
 * İndirim tanımlar ya da kaldırır (percent 0 / name boş). Ödenmemiş dönemlerin tutarı yeni orana göre güncellenir;
 * ödenmiş dönemler değişmez.
 */
export function setDiscount(registrationId: number, name: string | null, percent: number | null): void {
  const clean = name?.trim() || null;
  const p = clean && percent ? Math.round(percent) : null;
  if (p !== null && (p < 1 || p > 100)) throw new BillingError("İndirim oranı 1 ile 100 arasında olmalı.");
  const db = getDb();
  db.transaction(() => {
    const updated = db
      .update(registrations)
      .set({ discountName: p ? clean : null, discountPercent: p, updatedAt: new Date().toISOString() })
      .where(eq(registrations.id, registrationId))
      .returning({ id: registrations.id })
      .get();
    if (!updated) throw new BillingError("Kayıt bulunamadı.");
    const fee = getSettings().feeAmountKurus;
    if (fee > 0)
      db.update(feePeriods)
        .set({ amountKurus: discountedFee(fee, p) })
        .where(and(eq(feePeriods.registrationId, registrationId), eq(feePeriods.status, "open")))
        .run();
  });
}

export type DiscountUsage = { name: string; percents: number[]; students: { id: number; name: string; studentNo: number | null; percent: number; status: string }[] };

/** Uygulanan indirimler, ada göre gruplu (öneri listesi ve İndirimler sayfası). */
export function listDiscounts(): DiscountUsage[] {
  const rows = getDb()
    .select({ id: registrations.id, name: registrations.studentFullName, no: registrations.studentNo, dn: registrations.discountName, dp: registrations.discountPercent, status: registrations.status })
    .from(registrations)
    .all()
    .filter((r) => r.dn && r.dp);
  const map = new Map<string, DiscountUsage>();
  for (const r of rows) {
    const key = r.dn!.toLocaleLowerCase("tr-TR");
    const entry = map.get(key) ?? { name: r.dn!, percents: [], students: [] };
    if (!entry.percents.includes(r.dp!)) entry.percents.push(r.dp!);
    entry.students.push({ id: r.id, name: r.name, studentNo: r.no, percent: r.dp!, status: r.status });
    map.set(key, entry);
  }
  return [...map.values()].sort((a, b) => b.students.length - a.students.length || a.name.localeCompare(b.name, "tr"));
}

/** Kesim günü değişikliği sonraki dönemlerden itibaren geçerlidir. */
export function setBillingDay(registrationId: number, day: number): void {
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new BillingError("Kesim günü 1 ile 31 arasında olmalı.");
  const updated = getDb().update(registrations).set({ billingDay: day, updatedAt: new Date().toISOString() }).where(eq(registrations.id, registrationId)).returning().get();
  if (!updated) throw new BillingError("Kayıt bulunamadı.");
}

/** Aidat özeti: bugün ekranı kartları ve menü rozetleri için. */
export type BillingCounts = { locked: number; grace: number; claims: number; override: number; promiseToday: number; promiseMissed: number };

export function billingCounts(today: string = todayKey()): BillingCounts {
  const enrolled = getDb().select({ id: registrations.id, status: registrations.status }).from(registrations).where(eq(registrations.status, "enrolled")).all();
  const map = accessMap(enrolled, today);
  let locked = 0;
  let grace = 0;
  let override = 0;
  let promiseToday = 0;
  let promiseMissed = 0;
  for (const a of map.values()) {
    if (a.state === "locked") locked++;
    else if (a.state === "grace") grace++;
    else if (a.state === "override") override++;
    if (a.state === "override" && a.override?.endsOn === today) promiseToday++;
    if (a.promiseMissed) promiseMissed++;
  }
  return { locked, grace, override, promiseToday, promiseMissed, claims: countPendingClaims() };
}
