"use server";

import { z } from "zod";
import { can, requireAdmin } from "@/lib/auth/server";
import type { Permission } from "@/lib/auth/permissions";
import { idSchema, invalid, runAdmin, type ActionResult } from "@/lib/admin-action";
import { deleteOtherSessions, deleteUserSession } from "@/lib/auth/sessions";
import { AgeGroupError, ageGroupInputSchema } from "@/lib/age-groups-db";
import { deleteAgeGroup, describePlan, needsConfirm, previewGroupRange, saveGroupRange, type RangePlan } from "@/lib/group-ranges";
import { deleteCallbackRequest, setCallbackStatus, updateCallbackNote } from "@/lib/callbacks";
import { formatDateTr, istanbulLocalToIso } from "@/lib/format";
import { listPublishedTexts, recordConsent } from "@/lib/legal";
import { normalizePhone } from "@/lib/phone";
import { BillingError, createOverride, recordPayment, setBillingDay, setDiscount, todayKey } from "@/lib/billing";
import { formatMoney } from "@/lib/billing-shared";
import { recordMeasurement } from "@/lib/development";
import { createOrder, DELIVERY, EquipmentError, existingOrder, listItems } from "@/lib/equipment";
import { applySubmission, dismissSubmission, markNotDuplicate, mergeRegistrations, MergeError, pendingSubmissions } from "@/lib/merge";
import { coerceFormValues, validateRegistrationAdmin, type RegistrationFormValues } from "@/lib/validation";
import {
  cancelAppointment,
  changeStatus,
  createQuickRegistration,
  getRegistration,
  keepSensitiveFields,
  DuplicateStudentError,
  enrollRegistration,
  markLeft,
  markNoShow,
  rejoin,
  RegistrationStateError,
  restoreProcess,
  RegistrationNotFoundError,
  scheduleAppointment,
  setGoalkeeper,
  setRegistrationStatus,
  updateAdminNote,
} from "@/lib/registrations";

export type { ActionResult } from "@/lib/admin-action";

/** Bu dosyadaki işlemler: kayıt/grup hataları kullanıcıya olduğu gibi gösterilir. */
const run = (
  permission: Permission | null,
  scope: string,
  fn: Parameters<typeof runAdmin>[2],
): Promise<ActionResult> => runAdmin(permission, scope, fn, [RegistrationNotFoundError, AgeGroupError, RegistrationStateError, BillingError, EquipmentError]);

/* ---------------- Sahada hızlı kayıt ---------------- */

const quickSchema = z.object({
  studentFullName: z.string().trim().min(3, { error: "Öğrencinin adını ve soyadını yazın." }).max(120),
  birthDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  parentType: z.enum(["anne", "baba", "diger"]),
  parentFullName: z.string().trim().max(120),
  phone: z.string().trim().max(30),
  note: z.string().trim().max(500),
});

export type QuickNewValues = z.input<typeof quickSchema>;

/**
 * Sahada gelen veli için dört bilgiyle kayıt (öğrenci adı, doğum tarihi, veli, telefon); kalanlar "eksik bilgi"
 * olarak sonra tamamlanır. Geçersiz telefon kaydı durdurmaz, Veri Kontrolü'nde işaretlenir.
 */
export async function quickCreateAction(values: QuickNewValues): Promise<ActionResult & { id?: number }> {
  const parsed = quickSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const phone = d.phone ? (normalizePhone(d.phone) ?? d.phone) : null;
  let id: number | undefined;
  const res = await run("kayit.duzenle", "quick create", () => {
    const reg = createQuickRegistration({
      studentFullName: d.studentFullName,
      parentFullName: d.parentFullName || null,
      phone,
      groupId: null,
      birthDate: d.birthDate || null,
      adminNote: d.note ? `${formatDateTr(todayKey()).slice(0, 5)} · ${d.note.replace(/\s+/g, " ")}` : null,
      parentType: d.parentType,
    });
    id = reg.id;
    return { action: "kayit.elle-ekle", entity: "registration", entityId: reg.id, summary: `${reg.studentFullName}: sahada hızlı kayıt` };
  });
  return res.ok ? { ...res, id } : res;
}

/* ---------------- Ön kayıt süreci ---------------- */

export async function scheduleAppointmentAction(id: number, localDateTime: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz kayıt." };
  const iso = istanbulLocalToIso(localDateTime);
  if (!iso) return { ok: false, error: "Geçerli bir randevu tarihi ve saati seçiniz.", fieldErrors: { appointmentAt: "Tarih ve saat seçiniz." } };
  return run("kayit.duzenle", "schedule appointment", () => void scheduleAppointment(id, iso));
}

export async function markNoShowAction(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz kayıt." };
  return run("kayit.duzenle", "mark no-show", () => void markNoShow(id));
}

export async function setStatusAction(id: number, status: "cancelled" | "pending"): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success || (status !== "cancelled" && status !== "pending")) return { ok: false, error: "Geçersiz istek." };
  return run("kayit.duzenle", "set status", () => {
    const reg = setRegistrationStatus(id, status);
    return { action: status === "cancelled" ? "kayit.vazgecti" : "kayit.yeniden", entity: "registration", entityId: id, summary: `${reg.studentFullName}: ${status === "cancelled" ? "vazgeçti olarak işaretlendi" : "süreç yeniden başlatıldı"}` };
  });
}

/** Boş bırakılabilir ölçü: boşsa null. */
const optionalDecimal = (label: string, min: number, max: number) =>
  z
    .string()
    .transform((v) => v.trim().replace(",", "."))
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v >= min && v <= max), { error: `${label} ${min}–${max} arasında olmalıdır.` });

const enrollSchema = z.object({
  heightCm: optionalDecimal("Boy", 60, 220).transform((v) => (v === null ? null : Math.round(v))),
  weightKg: optionalDecimal("Kilo", 10, 150).transform((v) => (v === null ? null : Math.round(v * 10) / 10)),
  groupId: z.coerce.number({ error: "Grup seçiniz." }).int().positive({ error: "Grup seçiniz." }),
  enrolledOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Kayıt tarihini seçiniz." }),
});

export type EnrollFormValues = {
  heightCm: string;
  weightKg: string;
  groupId: string;
  enrolledOn: string;
  isGoalkeeper?: boolean;
  firstPayment?: "" | "cash" | "eft";
  /** Aidatı henüz vermediyse veli ödeyeceği gün (ödeme sözü). */
  promiseOn?: string;
  billingDay?: string;
  discountOn?: boolean;
  discountName?: string;
  discountPercent?: string;
  /** Kayıtta verilen / sipariş edilecek malzemeler (forma, eşofman). */
  orders?: { itemId: number; paid: boolean; delivery: string; size: string; owned?: boolean; sockSize?: string; sockDelivery?: string }[];
  /** Yönetici notuna eklenir (ör. "aidatı 26 Eylül'de verecek"). */
  note?: string;
  /** Kâğıt kayıt formundaki onaylar: zorunlu metinler imzalı mı, fotoğraf izni (boş: sorulmadı). */
  consents?: { signed: boolean; photo: "" | "yes" | "no" };
};

export async function enrollAction(id: number, values: EnrollFormValues): Promise<ActionResult & { studentNo?: number | null; paymentId?: number }> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz kayıt." };
  const parsed = enrollSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  const enrolledAtIso = istanbulLocalToIso(`${parsed.data.enrolledOn}T12:00`);
  if (!enrolledAtIso) return { ok: false, error: "Kayıt tarihini seçiniz.", fieldErrors: { enrolledOn: "Kayıt tarihini seçiniz." } };
  const { heightCm, weightKg, groupId } = parsed.data;
  const firstPayment = values.firstPayment === "cash" || values.firstPayment === "eft" ? values.firstPayment : null;
  const billingDay = values.billingDay?.trim() ? Number(values.billingDay) : null;
  if (billingDay !== null && (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31))
    return { ok: false, error: "Kesim günü 1–31 arasında olmalı.", fieldErrors: { billingDay: "1–31 arası bir gün yazın." } };
  const discountName = values.discountOn ? (values.discountName ?? "").trim().slice(0, 60) : "";
  const discountPercent = values.discountOn ? Number((values.discountPercent ?? "").replace(",", ".")) : 0;
  if (values.discountOn) {
    if (!discountName) return { ok: false, error: "İndirim adını yazın.", fieldErrors: { discountName: "İndirim adını yazın." } };
    if (!Number.isFinite(discountPercent) || discountPercent < 1 || discountPercent > 100)
      return { ok: false, error: "İndirim oranı 1–100 arasında olmalı.", fieldErrors: { discountPercent: "1–100 arası." } };
  }
  const orders = z
    .array(
      z.object({
        itemId: z.number().int().positive(),
        paid: z.boolean(),
        delivery: z.enum(DELIVERY),
        size: z.string().trim().max(20),
        owned: z.boolean().optional(),
        sockSize: z.string().trim().max(20).optional(),
        sockDelivery: z.enum(DELIVERY).optional(),
      }),
    )
    .max(10)
    .safeParse(values.orders ?? []);
  if (!orders.success) return { ok: false, error: "Malzeme bilgisi geçersiz; teslim durumunu seçin." };
  const note = (values.note ?? "").trim().slice(0, 500);
  const promiseOn = !firstPayment && values.promiseOn && /^\d{4}-\d{2}-\d{2}$/.test(values.promiseOn) ? values.promiseOn : null;
  let out: { studentNo: number | null; paymentId?: number } | undefined;
  const res = await run("kayit.duzenle", "enroll", (actor, user) => {
    if (firstPayment && !can(user, "aidat.al")) throw new BillingError("Ödeme almak için yetkiniz yok.");
    if (promiseOn && !can(user, "erisim.ac")) throw new BillingError("Ödeme sözü girmek için yetkiniz yok.");
    if (orders.data.length && !can(user, "aidat.al")) throw new BillingError("Malzeme kaydı için aidat yetkisi gerekir.");
    if ((values.discountOn || billingDay !== null) && !can(user, "aidat.al")) throw new BillingError("İndirim ve kesim günü için aidat yetkisi gerekir.");
    const current = getRegistration(id);
    if (!current) throw new RegistrationNotFoundError();
    const newlyEnrolled = current.status !== "enrolled";
    // Boş bırakılan ölçü eskisini silmez; ölçüler sonradan Gelişim'den de girilebilir.
    const isGoalkeeper = typeof values.isGoalkeeper === "boolean" ? values.isGoalkeeper : undefined;
    const reg = enrollRegistration(id, { heightCm: heightCm ?? current.heightCm, weightKg: weightKg ?? current.weightKg, groupId, enrolledAtIso, isGoalkeeper });
    if (billingDay !== null) setBillingDay(id, billingDay);
    if (values.discountOn) setDiscount(id, discountName, Math.round(discountPercent));
    const measured = heightCm !== null || weightKg !== null;
    if (measured && (newlyEnrolled || heightCm !== current.heightCm || weightKg !== current.weightKg))
      recordMeasurement({ registrationId: id, measuredOn: newlyEnrolled ? parsed.data.enrolledOn : todayKey(), heightCm: heightCm ?? current.heightCm, weightKg: weightKg ?? current.weightKg, userId: actor.id });
    let paid = "";
    out = { studentNo: reg.studentNo };
    // Geriye dönük girilen kayıtta, kayıtta alınan para kayıt gününe yazılır (kasada o günde görünür).
    const payDay = parsed.data.enrolledOn < todayKey() ? parsed.data.enrolledOn : todayKey();
    if (firstPayment) {
      const payment = recordPayment(id, { periodCount: 1, method: firstPayment, paidOn: payDay, note: "Kayıtta alındı" }, actor.id);
      out.paymentId = payment.id;
      paid = `, ilk aidat alındı (${formatMoney(payment.amountKurus)}, makbuz ${payment.receiptNo})`;
    } else if (promiseOn) {
      createOverride({ registrationId: id, reason: null, endsOn: promiseOn, userId: actor.id });
      paid = `, ödeme sözü ${formatDateTr(promiseOn)}`;
    }
    const items = new Map(listItems(true).map((i) => [i.id, i]));
    const kit: string[] = [];
    for (const o of orders.data) {
      const item = items.get(o.itemId);
      if (!item) throw new EquipmentError("Malzeme bulunamadı.");
      if (existingOrder(id, o.itemId)) continue;
      createOrder(id, { itemId: o.itemId, size: o.size || null, sockSize: o.sockSize, sockDelivery: o.sockDelivery, priceKurus: item.priceKurus, paid: o.paid, paidMethod: firstPayment ?? "cash", owned: o.owned, delivery: o.delivery, note: null }, actor.id, payDay);
      kit.push(`${item.name} (${o.owned ? "zaten var" : o.paid ? "ödendi" : "ödenmedi"})`);
    }
    // Kâğıt formdaki onaylar yazılı beyan olarak işlenir (dosyadaki Onaylar'da "yazılı, admin işledi")
    const consentParts: string[] = [];
    const signed = newlyEnrolled && values.consents?.signed === true;
    const photo = newlyEnrolled && (values.consents?.photo === "yes" || values.consents?.photo === "no") ? values.consents.photo : null;
    if (signed || photo) {
      for (const { text, version } of listPublishedTexts()) {
        const accepted = text.key === "foto-izni" ? (photo ? photo === "yes" : null) : text.consentType === "required" && signed ? true : null;
        if (accepted === null) continue;
        recordConsent({ userId: actor.id, registrationId: id, versionId: version.id, accepted, method: "admin_attest", note: "Kayıt formunda imzalı (okula kayıtta işlendi)", ip: actor.ip });
      }
      if (signed) consentParts.push("kayıt formu imzalı");
      if (photo) consentParts.push(photo === "yes" ? "fotoğraf izni var" : "fotoğraf izni yok");
    }
    if (note) {
      const current = getRegistration(id)?.adminNote?.trim() ?? "";
      if (!current.includes(note)) updateAdminNote(id, [current, `${formatDateTr(todayKey()).slice(0, 5)} · ${note.replace(/\s+/g, " ")}`].filter(Boolean).join("\n"));
    }
    const size = measured ? ` (boy ${heightCm ?? "—"} cm, kilo ${weightKg ?? "—"} kg)` : "";
    return {
      action: newlyEnrolled ? "kayit.asil" : "kayit.grup",
      entity: "registration",
      entityId: id,
      summary: newlyEnrolled
        ? `${reg.studentFullName}: asıl kayıt, öğrenci no ${reg.studentNo}${reg.isGoalkeeper ? ", kaleci" : ""}${size}${values.discountOn ? `, indirim: ${discountName} %${Math.round(discountPercent)}` : ""}${paid}${kit.length ? `, malzeme: ${kit.join(", ")}` : ""}${consentParts.length ? `, onaylar: ${consentParts.join(", ")}` : ""}`
        : `${reg.studentFullName}: grup ve ölçüler güncellendi${current.isGoalkeeper !== reg.isGoalkeeper ? (reg.isGoalkeeper ? ", kaleci oldu" : ", artık kaleci değil") : ""}${size}`,
      data: { groupId },
    };
  });
  return res.ok ? { ...res, ...out } : res;
}

export async function markLeftAction(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz kayıt." };
  return run("kayit.duzenle", "mark left", () => {
    const reg = markLeft(id);
    return { action: "kayit.ayrildi", entity: "registration", entityId: id, summary: `${reg.studentFullName}: okuldan ayrıldı` };
  });
}

export async function setGoalkeeperAction(id: number, isGoalkeeper: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success || typeof isGoalkeeper !== "boolean") return { ok: false, error: "Geçersiz kayıt." };
  return run("kayit.duzenle", "set goalkeeper", () => {
    const reg = setGoalkeeper(id, isGoalkeeper);
    return { action: "kayit.kaleci", entity: "registration", entityId: id, summary: `${reg.studentFullName}: ${isGoalkeeper ? "kaleci olarak işaretlendi" : "kaleci değil (oyuncu)"}` };
  });
}

export async function rejoinAction(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz kayıt." };
  return run("kayit.duzenle", "rejoin", () => {
    const reg = rejoin(id);
    return { action: "kayit.dondu", entity: "registration", entityId: id, summary: `${reg.studentFullName}: yeniden etkinleştirildi (kesim günü ${reg.billingDay})` };
  });
}

const restoreSchema = z.object({
  status: z.enum(["pending", "scheduled", "no_show", "cancelled"]),
  noShowCount: z.number().int().min(0).max(100),
  appointmentAt: z.iso.datetime().nullable().optional(),
});

export async function cancelAppointmentAction(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz kayıt." };
  return run("kayit.duzenle", "cancel appointment", () => {
    const before = getRegistration(id);
    const reg = cancelAppointment(id);
    return { action: "kayit.randevu-geri-al", entity: "registration", entityId: id, summary: `${reg.studentFullName}: randevu geri alındı${before?.appointmentAt ? ` (${before.appointmentAt})` : ""}` };
  });
}

/** "Geri Al" düğmesi: son hızlı işlemi (gelmedi, vazgeçti, yeniden başlat) geri alır. */
export async function restoreProcessAction(id: number, previous: { status: string; noShowCount: number; appointmentAt?: string | null }): Promise<ActionResult> {
  const parsed = restoreSchema.safeParse(previous);
  if (!idSchema.safeParse(id).success || !parsed.success) return { ok: false, error: "Geri alınamadı." };
  return run("kayit.duzenle", "restore process", () => void restoreProcess(id, parsed.data.status, parsed.data.noShowCount, parsed.data.appointmentAt));
}

const NOTE_MAX = 4000;

export async function updateNoteAction(id: number, note: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success || typeof note !== "string") return { ok: false, error: "Geçersiz kayıt." };
  const trimmed = note.trim();
  if (trimmed.length > NOTE_MAX) return { ok: false, error: `Notlar toplam en fazla ${NOTE_MAX} karakter olabilir.` };
  return run("kayit.duzenle", "update note", () => void updateAdminNote(id, trimmed || null));
}

/** Hızlı not: başına bugünün tarihi yazılarak mevcut notların altına eklenir. */
export async function appendNoteAction(id: number, text: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success || typeof text !== "string") return { ok: false, error: "Geçersiz kayıt." };
  const line = text.replace(/\s+/g, " ").trim();
  if (!line) return { ok: false, error: "Notu yazın." };
  if (line.length > 500) return { ok: false, error: "Tek not en fazla 500 karakter olabilir." };
  return run("kayit.duzenle", "append note", () => {
    const current = getRegistration(id)?.adminNote?.trim() ?? "";
    const next = [current, `${formatDateTr(todayKey()).slice(0, 5)} · ${line}`].filter(Boolean).join("\n");
    if (next.length > NOTE_MAX) throw new RegistrationStateError("Not alanı doldu; eski notları düzenleyip kısaltın.");
    updateAdminNote(id, next);
  });
}

/* ---------------- Yaş grupları ---------------- */

export type AgeGroupFormValues = { name: string; minBirthYear: string; maxBirthYear: string };

export type SaveGroupResult = ActionResult | { ok: false; error: string; plan: RangePlan };

/**
 * Grubun adı ve doğum yılı aralığı. Aralık başka grupların yıllarına taşıyorsa önce plan döner (birleşme, daralan
 * gruplar, taşınacak öğrenciler); kullanıcı onaylayınca `confirmed` ile aynı plan tek işlemde uygulanır.
 */
export async function saveAgeGroupAction(id: number | null, values: AgeGroupFormValues, confirmed = false): Promise<SaveGroupResult> {
  if (id !== null && !idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz grup." };
  const parsed = ageGroupInputSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  if (!confirmed) {
    await requireAdmin("program.yonet");
    try {
      const plan = previewGroupRange(id, parsed.data);
      if (needsConfirm(plan)) return { ok: false, error: "Onay bekleniyor.", plan };
    } catch (err) {
      if (err instanceof AgeGroupError) return { ok: false, error: err.message };
      throw err;
    }
  }
  return run("program.yonet", "save age group", () => {
    const { group, plan } = saveGroupRange(id, parsed.data);
    return { action: id === null ? "grup.ekle" : "grup.duzenle", entity: "age_group", entityId: group.id, summary: describePlan(group, plan) };
  });
}

export async function deleteAgeGroupAction(id: number, moveToId: number | null): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success || (moveToId !== null && !idSchema.safeParse(moveToId).success)) {
    return { ok: false, error: "Geçersiz grup." };
  }
  return run("program.yonet", "delete age group", () => {
    deleteAgeGroup(id, moveToId);
    return { action: "grup.sil", entity: "age_group", entityId: id, summary: `Grup silindi${moveToId ? `, öğrenciler #${moveToId} grubuna taşındı` : ""}` };
  });
}

/* ---------------- Arama talepleri ---------------- */

function mustExist(found: boolean): void {
  if (!found) throw new RegistrationNotFoundError();
}

export async function setCallbackStatusAction(id: number, status: "new" | "done"): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success || (status !== "new" && status !== "done")) return { ok: false, error: "Geçersiz istek." };
  return run("kayit.duzenle", "callback status", () => mustExist(setCallbackStatus(id, status)));
}

export async function updateCallbackNoteAction(id: number, note: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz istek." };
  const trimmed = note.trim();
  if (trimmed.length > 1000) return { ok: false, error: "Not en fazla 1000 karakter olabilir." };
  return run("kayit.duzenle", "callback note", () => mustExist(updateCallbackNote(id, trimmed || null)));
}

export async function deleteCallbackAction(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz istek." };
  return run("kayit.sil", "callback delete", () => {
    mustExist(deleteCallbackRequest(id));
    return { action: "arama.sil", entity: "callback", entityId: id, summary: "Arama talebi silindi" };
  });
}

/* ---------------- Güvenlik: oturumlar ---------------- */

export async function revokeSessionAction(sessionId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!/^[a-f0-9]{64}$/.test(sessionId)) return { ok: false, error: "Geçersiz oturum." };
  if (sessionId === admin.sessionId) return { ok: false, error: "Bu cihazın oturumunu kapatmak için Çıkış Yap'ı kullanın." };
  return run(null, "revoke session", () => mustExist(deleteUserSession(admin.id, sessionId)));
}

export async function revokeOtherSessionsAction(): Promise<ActionResult> {
  const admin = await requireAdmin();
  return run(null, "revoke other sessions", () => void deleteOtherSessions(admin.id, admin.sessionId));
}

/* ---------------- Tekrar eden kayıt / veliden gelen güncelleme ---------------- */

export async function mergeRegistrationsAction(keepId: number, dropId: number, values: RegistrationFormValues): Promise<ActionResult> {
  if (!idSchema.safeParse(keepId).success || !idSchema.safeParse(dropId).success) return { ok: false, error: "Geçersiz istek." };
  const parsed = validateRegistrationAdmin(coerceFormValues(values));
  if (!parsed.success) return { ok: false, error: Object.values(parsed.errors)[0] ?? "Alanları kontrol edin.", fieldErrors: parsed.errors };
  return runAdmin(
    "kayit.duzenle",
    "merge registrations",
    (_actor, user) => {
      const data = can(user, "hassas.gor") ? parsed.data : keepSensitiveFields(parsed.data, getRegistration(keepId), getRegistration(dropId));
      const merged = mergeRegistrations(keepId, dropId, data);
      return { action: "kayit.birlestir", entity: "registration", entityId: keepId, summary: `${merged.studentFullName}: #${dropId} bu kayda birleştirildi` };
    },
    [MergeError, RegistrationNotFoundError, DuplicateStudentError],
  );
}

export async function applySubmissionAction(submissionId: number, values: RegistrationFormValues): Promise<ActionResult> {
  if (!idSchema.safeParse(submissionId).success) return { ok: false, error: "Geçersiz istek." };
  const parsed = validateRegistrationAdmin(coerceFormValues(values));
  if (!parsed.success) return { ok: false, error: Object.values(parsed.errors)[0] ?? "Alanları kontrol edin.", fieldErrors: parsed.errors };
  return runAdmin(
    "kayit.duzenle",
    "apply submission",
    (actor, user) => {
      let data = parsed.data;
      if (!can(user, "hassas.gor")) {
        const [regId, sub] = [...pendingSubmissions().entries()].find(([, v]) => v.id === submissionId) ?? [];
        data = keepSensitiveFields(parsed.data, sub?.values, regId ? getRegistration(regId) : null);
      }
      const reg = applySubmission(submissionId, data, actor.id);
      return { action: "kayit.guncelleme-uygula", entity: "registration", entityId: reg.id, summary: `${reg.studentFullName}: veliden gelen bilgiler uygulandı` };
    },
    [MergeError, RegistrationNotFoundError, DuplicateStudentError],
  );
}

export async function dismissSubmissionAction(submissionId: number): Promise<ActionResult> {
  if (!idSchema.safeParse(submissionId).success) return { ok: false, error: "Geçersiz istek." };
  return runAdmin(
    "kayit.duzenle",
    "dismiss submission",
    (actor) => {
      const regId = dismissSubmission(submissionId, actor.id);
      return { action: "kayit.guncelleme-yoksay", entity: "registration", entityId: regId, summary: "Veliden gelen güncelleme yok sayıldı" };
    },
    [MergeError],
  );
}

export async function notDuplicateAction(aId: number, bId: number): Promise<ActionResult> {
  if (!idSchema.safeParse(aId).success || !idSchema.safeParse(bId).success) return { ok: false, error: "Geçersiz istek." };
  return run("kayit.duzenle", "not duplicate", () => {
    markNotDuplicate(aId, bId);
    return { action: "kayit.farkli-kisi", entity: "registration", entityId: aId, summary: `#${aId} ve #${bId} farklı kişi olarak işaretlendi` };
  });
}

/** Durumu elle değiştirme. Asıl kayıt, kayıt penceresinden; ayrılma, "Okuldan ayrıldı" ile yapılır. */
export async function changeStatusAction(id: number, status: string): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz kayıt." };
  if (!["pending", "scheduled", "no_show", "cancelled"].includes(status)) return { ok: false, error: "Bu durum buradan seçilemez." };
  return run("kayit.duzenle", "change status", () => {
    const reg = changeStatus(id, status as "pending" | "scheduled" | "no_show" | "cancelled");
    return { action: "kayit.durum", entity: "registration", entityId: id, summary: `${reg.studentFullName}: durum elle "${status}" yapıldı` };
  });
}
