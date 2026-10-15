"use server";

import { z } from "zod";
import { idSchema, invalid, runAdmin, type ActionResult } from "@/lib/admin-action";
import { writeAudit } from "@/lib/audit";
import { can, requireAdmin } from "@/lib/auth/server";
import {
  accessOf,
  approveClaim,
  BillingError,
  billingDetail,
  createOverride,
  paymentPlans,
  recordPayment,
  rejectClaim,
  revokeOverride,
  setBillingDay,
  setDiscount,
  setSessionsLeft,
  listDiscounts,
  todayKey,
  updatePayment,
  voidPayment,
  voidPeriod,
  periodsForPayment,
  type BillingDetail,
  type PaymentPlans,
} from "@/lib/billing";
import { dayLabel, formatMoney, PAYMENT_METHOD_LABELS, PAYMENT_METHODS, periodRangeLabel, SESSIONS_PER_PACK, type Access } from "@/lib/billing-shared";
import { notify } from "@/lib/notifications";
import { getRegistration } from "@/lib/registrations";

const run = (permission: Parameters<typeof runAdmin>[0], scope: string, fn: Parameters<typeof runAdmin>[2]) => runAdmin(permission, scope, fn, [BillingError]);

const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Tarih seçiniz." });
const reasonSchema = (label: string) => z.string().trim().min(3, { error: `${label} yazınız.` }).max(300);

function studentName(id: number): string {
  return getRegistration(id)?.studentFullName ?? `#${id}`;
}

/* ---------------- Ödeme ---------------- */

const paymentSchema = z.object({
  periodCount: z.coerce.number().int().min(1).max(12),
  method: z.enum(PAYMENT_METHODS, { error: "Ödeme şeklini seçiniz." }),
  paidOn: daySchema,
  note: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v || null),
  start: z.enum(["chain", "restart"]).default("chain"),
});

/** start: "chain" kaldığı paketten devam, "restart" hak ödeme tarihinden (sonraki ilk antrenmandan) başlar. */
export type PaymentFormValues = { periodCount: string; method: string; paidOn: string; note: string; start?: "chain" | "restart" };

export type RecordedPayment = { id: number; receiptNo: string; amountKurus: number; periodCount: number; periodLabel: string };

export async function recordPaymentAction(registrationId: number, values: PaymentFormValues): Promise<ActionResult & { payment?: RecordedPayment }> {
  if (!idSchema.safeParse(registrationId).success) return { ok: false, error: "Geçersiz kayıt." };
  const parsed = paymentSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.paidOn > todayKey()) return { ok: false, error: "Ödeme tarihi ileri bir gün olamaz.", fieldErrors: { paidOn: "İleri tarih olamaz." } };
  let payment: RecordedPayment | undefined;
  const res = await run("aidat.al", "record payment", (actor) => {
    const { start, ...input } = parsed.data;
    const p = recordPayment(registrationId, { ...input, startFrom: start === "restart" ? input.paidOn : null }, actor.id);
    const periods = periodsForPayment(p.id);
    const first = periods[0];
    const last = periods.at(-1);
    payment = { id: p.id, receiptNo: p.receiptNo, amountKurus: p.amountKurus, periodCount: p.periodCount, periodLabel: `${p.periodCount * SESSIONS_PER_PACK} antrenman${first && last ? ` · ${periodRangeLabel(first.startDate, last.endDate)}` : ""}` };
    return {
      action: "aidat.odeme",
      entity: "registration",
      entityId: registrationId,
      summary: `${studentName(registrationId)}: ${formatMoney(p.amountKurus)} ${p.method === "cash" ? "nakit" : "EFT"}, ${p.periodCount * SESSIONS_PER_PACK} antrenman${first && last ? ` (${periodRangeLabel(first.startDate, last.endDate)})` : ""}${start === "restart" ? ", hak ödeme tarihinden başlatıldı" : ""}, makbuz ${p.receiptNo}`,
    };
  });
  return res.ok ? { ...res, payment } : res;
}

/** Ödeme penceresindeki önizleme: veritabanını değiştirmez. */
export async function paymentPlanAction(registrationId: number, periodCount: number, paidOn: string): Promise<PaymentPlans | null> {
  await requireAdmin("aidat.al");
  if (!idSchema.safeParse(registrationId).success || !z.number().int().min(1).max(12).safeParse(periodCount).success || !daySchema.safeParse(paidOn).success) return null;
  if (paidOn > todayKey()) return null;
  return paymentPlans(registrationId, periodCount, paidOn);
}

export async function voidPaymentAction(paymentId: number, reason: string): Promise<ActionResult> {
  if (!idSchema.safeParse(paymentId).success) return { ok: false, error: "Geçersiz ödeme." };
  const parsed = reasonSchema("İptal gerekçesini").safeParse(reason);
  if (!parsed.success) return invalid(parsed.error);
  return run("aidat.al", "void payment", (actor) => {
    const p = voidPayment(paymentId, parsed.data, actor.id);
    return { action: "aidat.odeme-iptal", entity: "registration", entityId: p.registrationId, summary: `${studentName(p.registrationId)}: makbuz ${p.receiptNo} iptal edildi (${parsed.data})` };
  });
}

const correctionSchema = z.object({
  method: z.enum(PAYMENT_METHODS, { error: "Ödeme şeklini seçiniz." }),
  paidOn: daySchema,
  note: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v || null),
});

/** Kasa defterinden düzeltme: ödeme şekli, günü, notu (tutar ve hak tarihleri değişmez). */
export async function updatePaymentAction(paymentId: number, values: { method: string; paidOn: string; note: string }): Promise<ActionResult> {
  if (!idSchema.safeParse(paymentId).success) return { ok: false, error: "Geçersiz ödeme." };
  const parsed = correctionSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.paidOn > todayKey()) return { ok: false, error: "Ödeme tarihi ileri bir gün olamaz.", fieldErrors: { paidOn: "İleri tarih olamaz." } };
  return run("aidat.al", "update payment", () => {
    const { before, after } = updatePayment(paymentId, parsed.data);
    const changes = [
      before.method !== after.method ? `${PAYMENT_METHOD_LABELS[before.method as keyof typeof PAYMENT_METHOD_LABELS] ?? before.method} → ${PAYMENT_METHOD_LABELS[after.method as keyof typeof PAYMENT_METHOD_LABELS] ?? after.method}` : null,
      before.paidOn !== after.paidOn ? `${dayLabel(before.paidOn, true)} → ${dayLabel(after.paidOn, true)}` : null,
      (before.note ?? "") !== (after.note ?? "") ? "not" : null,
    ].filter(Boolean);
    return {
      action: "aidat.odeme-duzelt",
      entity: "registration",
      entityId: after.registrationId,
      summary: `${studentName(after.registrationId)}: makbuz ${after.receiptNo} düzeltildi${changes.length ? ` (${changes.join(", ")})` : ""}`,
    };
  });
}

/** Birden çok ödemeyi aynı gerekçeyle iptal eder (ör. kayıtta yanlışlıkla "alındı" seçilenler); dönemleri yeniden açılır. */
export async function voidPaymentsAction(paymentIds: number[], reason: string): Promise<ActionResult & { count?: number }> {
  const ids = z.array(idSchema).min(1).max(100).safeParse(paymentIds);
  if (!ids.success) return { ok: false, error: "Ödeme seçin." };
  const parsed = reasonSchema("İptal gerekçesini").safeParse(reason);
  if (!parsed.success) return invalid(parsed.error);
  let count = 0;
  const res = await run("aidat.al", "void payments", (actor) => {
    for (const id of new Set(ids.data)) {
      const p = voidPayment(id, parsed.data, actor.id);
      count++;
      writeAudit(actor, { action: "aidat.odeme-iptal", entity: "registration", entityId: p.registrationId, summary: `${studentName(p.registrationId)}: makbuz ${p.receiptNo} iptal edildi (${parsed.data})` });
    }
  });
  return res.ok ? { ...res, count } : res;
}

export async function voidPeriodAction(periodId: number, reason: string): Promise<ActionResult> {
  if (!idSchema.safeParse(periodId).success) return { ok: false, error: "Geçersiz dönem." };
  const parsed = reasonSchema("Gerekçeyi").safeParse(reason);
  if (!parsed.success) return invalid(parsed.error);
  return run("aidat.al", "void period", () => {
    const p = voidPeriod(periodId, parsed.data);
    return { action: "aidat.donem-kaldir", entity: "registration", entityId: p.registrationId, summary: `${studentName(p.registrationId)}: ${p.startDate} dönemi kaldırıldı (${parsed.data})` };
  });
}

/** Elle hak girişi: kalan antrenman hakkı (kağıttaki kayıttan). Sonraki ödeme günü buna göre kayar. */
export async function setSessionsLeftAction(registrationId: number, left: number): Promise<ActionResult & { paidUntil?: string }> {
  if (!idSchema.safeParse(registrationId).success || !Number.isInteger(left) || left < 0 || left > 96) return { ok: false, error: "Geçersiz istek." };
  let paidUntil: string | undefined;
  const res = await run("aidat.al", "set sessions left", () => {
    const r = setSessionsLeft(registrationId, left);
    paidUntil = r.paidUntil;
    return {
      action: "hak.duzelt",
      entity: "registration",
      entityId: registrationId,
      summary: `${studentName(registrationId)}: kalan hak ${r.before ?? "?"} → ${r.after}, sonraki ödeme ${dayLabel(r.paidUntil)}`,
    };
  });
  return res.ok ? { ...res, paidUntil } : res;
}

export async function setBillingDayAction(registrationId: number, day: number): Promise<ActionResult> {
  if (!idSchema.safeParse(registrationId).success || !z.number().int().min(1).max(31).safeParse(day).success) return { ok: false, error: "Kesim günü 1–31 arasında olmalı." };
  return run("aidat.al", "billing day", () => {
    setBillingDay(registrationId, day);
    return { action: "aidat.kesim-gunu", entity: "registration", entityId: registrationId, summary: `${studentName(registrationId)}: kesim günü ${day}` };
  });
}

export async function setDiscountAction(registrationId: number, name: string, percent: number | null): Promise<ActionResult> {
  if (!idSchema.safeParse(registrationId).success) return { ok: false, error: "Geçersiz kayıt." };
  const clean = String(name ?? "").trim().slice(0, 60);
  if (percent !== null && (!Number.isFinite(percent) || percent < 1 || percent > 100)) return { ok: false, error: "İndirim oranı 1–100 arasında olmalı." };
  if (percent !== null && !clean) return { ok: false, error: "İndirim adını yazın." };
  return run("aidat.al", "set discount", () => {
    setDiscount(registrationId, percent ? clean : null, percent);
    return { action: "aidat.indirim", entity: "registration", entityId: registrationId, summary: `${studentName(registrationId)}: ${percent ? `indirim ${clean} %${Math.round(percent)}` : "indirim kaldırıldı"}` };
  });
}

/* ---------------- Veli bildirimleri ---------------- */

export async function approveClaimAction(claimId: number, periodCount: number): Promise<ActionResult> {
  if (!idSchema.safeParse(claimId).success || !z.number().int().min(1).max(12).safeParse(periodCount).success) return { ok: false, error: "Geçersiz istek." };
  return run("aidat.al", "approve claim", (actor) => {
    const { claim, payment } = approveClaim(claimId, periodCount, actor.id);
    const name = studentName(claim.registrationId);
    if (claim.userId)
      notify({ userId: claim.userId, kind: "aidat.onay", title: "Ödemeniz onaylandı", body: `${name} için ${formatMoney(payment.amountKurus)} ödemeniz onaylandı. Makbuz no: ${payment.receiptNo}.`, link: "/veli" });
    return { action: "aidat.bildirim-onay", entity: "registration", entityId: claim.registrationId, summary: `${name}: veli bildirimi onaylandı, makbuz ${payment.receiptNo} (${formatMoney(payment.amountKurus)})` };
  });
}

export async function rejectClaimAction(claimId: number, reason: string): Promise<ActionResult> {
  if (!idSchema.safeParse(claimId).success) return { ok: false, error: "Geçersiz istek." };
  const parsed = reasonSchema("Red gerekçesini").safeParse(reason);
  if (!parsed.success) return invalid(parsed.error);
  return run("aidat.al", "reject claim", (actor) => {
    const claim = rejectClaim(claimId, parsed.data, actor.id);
    const name = studentName(claim.registrationId);
    if (claim.userId)
      notify({ userId: claim.userId, kind: "aidat.red", title: "Ödemeniz reddedildi", body: `${name} için bildirdiğiniz ödeme onaylanmadı. Lütfen bizimle iletişime geçin.`, link: "/veli" });
    return { action: "aidat.bildirim-red", entity: "registration", entityId: claim.registrationId, summary: `${name}: veli bildirimi reddedildi (${parsed.data})` };
  });
}

/* ---------------- Ödeme sözü ---------------- */

export async function createOverrideAction(registrationId: number, endsOn: string, note: string): Promise<ActionResult> {
  if (!idSchema.safeParse(registrationId).success) return { ok: false, error: "Geçersiz kayıt." };
  const parsed = z.object({ note: z.string().trim().max(200), endsOn: daySchema }).safeParse({ note, endsOn });
  if (!parsed.success) return invalid(parsed.error);
  return run("erisim.ac", "create promise", (actor) => {
    const o = createOverride({ registrationId, reason: parsed.data.note || null, endsOn: parsed.data.endsOn, userId: actor.id });
    return { action: "aidat.soz", entity: "registration", entityId: registrationId, summary: `${studentName(registrationId)}: ödeme sözü ${dayLabel(o.endsOn)}${parsed.data.note ? ` (${parsed.data.note})` : ""}` };
  });
}

export async function revokeOverrideAction(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz istek." };
  return run("erisim.ac", "revoke promise", (actor) => {
    const o = revokeOverride(id, actor.id);
    return { action: "aidat.soz-kaldir", entity: "registration", entityId: o.registrationId, summary: `${studentName(o.registrationId)}: ödeme sözü (${dayLabel(o.endsOn)}) kaldırıldı` };
  });
}

/* ---------------- Okuma ---------------- */

export type StudentBilling = BillingDetail & {
  access: Access;
  billingDay: number | null;
  discountName: string | null;
  discountPercent: number | null;
  discountSuggestions: { name: string; percent: number }[];
  canCollect: boolean;
  canOverride: boolean;
  today: string;
};

export async function getStudentBillingAction(registrationId: number): Promise<StudentBilling | null> {
  if (!idSchema.safeParse(registrationId).success) return null;
  const admin = await requireAdmin("aidat.gor");
  const reg = getRegistration(registrationId);
  if (!reg) return null;
  return {
    ...billingDetail(registrationId),
    access: accessOf(reg),
    billingDay: reg.billingDay,
    discountName: reg.discountName,
    discountPercent: reg.discountPercent,
    discountSuggestions: listDiscounts().map((d) => ({ name: d.name, percent: d.percents[0] ?? 0 })),
    canCollect: can(admin, "aidat.al"),
    canOverride: can(admin, "erisim.ac"),
    today: todayKey(),
  };
}
