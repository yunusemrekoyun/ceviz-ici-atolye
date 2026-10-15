import { z } from "zod";
import { BLOOD_GROUPS, CONTACT_PARENT_TYPES } from "@/lib/constants";
import { normalizePhone } from "@/lib/phone";
import { isTcFormat } from "@/lib/tc";
import { tidyName } from "@/lib/format";
import { REGISTRATION_FIELDS, emptyFormValues, type FieldErrors, type RegistrationField, type RegistrationFormValues } from "@/lib/registration-fields";

export { REGISTRATION_FIELDS, emptyFormValues, type FieldErrors, type RegistrationField, type RegistrationFormValues };

const MSG = {
  required: (label: string) => `${label} zorunludur.`,
  tooLong: (label: string, max: number) => `${label} en fazla ${max} karakter olabilir.`,
  tc: "T.C. Kimlik No 11 haneli olmalı ve 0 ile başlayamaz.",
  phone: "Geçerli bir cep telefonu giriniz (örn. 0555 555 55 55).",
  email: "Geçerli bir e-posta adresi giriniz.",
  birthDate: "Geçerli bir doğum tarihi giriniz.",
  birthDateFuture: "Doğum tarihi gelecekte olamaz.",
  bloodGroup: "Kan grubu seçiniz.",
  contactParentType: "İletişimde olunacak veliyi seçiniz.",
} as const;

function rawString() {
  return z.string({ error: "Geçersiz değer." });
}

function requiredText(label: string, max: number) {
  return rawString()
    .transform((v) => tidyName(v))
    .refine((v) => v.length > 0, { error: MSG.required(label) })
    .refine((v) => v.length <= max, { error: MSG.tooLong(label, max) });
}

function optionalText(label: string, max: number) {
  return rawString()
    .transform((v) => tidyName(v))
    .refine((v) => v.length <= max, { error: MSG.tooLong(label, max) })
    .transform((v) => (v.length === 0 ? null : v));
}

/*
 * T.C. kontrol haneleri tutmasa da kayıt durmaz: numara olduğu gibi saklanır, panelde "bozuk veri" olarak
 * işaretlenir (Veri kontrolü) ve oradan düzeltilir. Veli formunda yalnız 11 hane istenir.
 */
const requiredTc = rawString()
  .transform((v) => v.replace(/\s/g, ""))
  .refine((v) => v.length > 0, { error: MSG.required("T.C. Kimlik No") })
  .refine((v) => isTcFormat(v), { error: MSG.tc });

const optionalTc = rawString()
  .transform((v) => v.replace(/\s/g, ""))
  .refine((v) => v.length === 0 || isTcFormat(v), { error: MSG.tc })
  .transform((v) => (v.length === 0 ? null : v));

/** Panel: yalnız rakam (en çok 11); geçersiz numara kaydı durdurmaz, işaretlenir. */
const optionalTcFormat = rawString()
  .transform((v) => v.replace(/\s/g, ""))
  .refine((v) => v.length === 0 || /^\d{1,11}$/.test(v), { error: MSG.tc })
  .transform((v) => (v.length === 0 ? null : v));

const requiredPhone = (label: string) =>
  rawString()
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, { error: MSG.required(label) })
    .transform((v, ctx) => {
      const normalized = normalizePhone(v);
      if (!normalized) {
        ctx.addIssue({ code: "custom", message: MSG.phone });
        return z.NEVER;
      }
      return normalized;
    });

const optionalPhone = rawString()
  .transform((v) => v.trim())
  .transform((v, ctx) => {
    if (v.length === 0) return null;
    const normalized = normalizePhone(v);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: MSG.phone });
      return z.NEVER;
    }
    return normalized;
  });

const optionalEmail = rawString()
  .transform((v) => v.trim().toLowerCase())
  .refine((v) => v.length <= 254, { error: MSG.tooLong("E-mail", 254) })
  .refine((v) => v.length === 0 || z.email().safeParse(v).success, { error: MSG.email })
  .transform((v) => (v.length === 0 ? null : v));

const birthDate = rawString()
  .transform((v) => v.trim())
  .refine((v) => v.length > 0, { error: MSG.required("Doğum tarihi") })
  .refine((v) => isValidIsoDate(v), { error: MSG.birthDate })
  .refine((v) => !isFutureDate(v), { error: MSG.birthDateFuture })
  .refine((v) => Number(v.slice(0, 4)) >= 1900, { error: MSG.birthDate });

function isValidIsoDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

function isFutureDate(value: string): boolean {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  const now = new Date();
  // Kullanıcının yerel takvimiyle sunucunun UTC takvimi arasındaki saat farkını tolere etmek için
  // bugünün tarihi (UTC) ile karşılaştırılır; "bugün" geçerli sayılır.
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Date.UTC(y, m - 1, d) > todayUtc;
}

export const registrationSchema = z
  .object({
    studentTc: requiredTc,
    studentFullName: requiredText("Öğrenci adı soyadı", 120),
    birthDate,
    homeAddress: requiredText("Ev adresi", 500),
    studentPhone: requiredPhone("İrtibat telefonu"),
    bloodGroup: z.enum(BLOOD_GROUPS, { error: MSG.bloodGroup }),
    email: optionalEmail,

    fatherFullName: optionalText("Baba adı soyadı", 120),
    fatherTc: optionalTc,
    fatherPhone: optionalPhone,

    motherFullName: optionalText("Anne adı soyadı", 120),
    motherTc: optionalTc,
    motherPhone: optionalPhone,

    contactParentType: z.enum(CONTACT_PARENT_TYPES, { error: MSG.contactParentType }),
    contactParentFullName: optionalText("İletişim velisi adı soyadı", 120),
    contactParentPhone: optionalPhone,

    emergencyFullName: requiredText("Acil durum kişisi adı soyadı", 120),
    emergencyRelation: requiredText("Yakınlık durumu", 80),
    emergencyPhone: requiredPhone("Acil durum telefonu"),
  })
  .superRefine((val, ctx) => {
    const fatherAny = Boolean(val.fatherFullName || val.fatherTc || val.fatherPhone);
    const motherAny = Boolean(val.motherFullName || val.motherTc || val.motherPhone);
    const fatherComplete = Boolean(val.fatherFullName && val.fatherPhone);
    const motherComplete = Boolean(val.motherFullName && val.motherPhone);

    // Bir veli bloğuna başlandıysa ad soyad ve GSM zorunlu.
    if (fatherAny && !val.fatherFullName) {
      ctx.addIssue({ code: "custom", path: ["fatherFullName"], message: MSG.required("Baba adı soyadı") });
    }
    if (fatherAny && !val.fatherPhone) {
      ctx.addIssue({ code: "custom", path: ["fatherPhone"], message: MSG.required("Baba GSM") });
    }
    if (motherAny && !val.motherFullName) {
      ctx.addIssue({ code: "custom", path: ["motherFullName"], message: MSG.required("Anne adı soyadı") });
    }
    if (motherAny && !val.motherPhone) {
      ctx.addIssue({ code: "custom", path: ["motherPhone"], message: MSG.required("Anne GSM") });
    }

    // İletişimde olunacak veli seçimine göre ilgili bilgiler zorunlu.
    if (val.contactParentType === "anne") {
      if (!val.motherFullName) {
        ctx.addIssue({ code: "custom", path: ["motherFullName"], message: "İletişim velisi Anne seçildi; anne adı soyadı zorunludur." });
      }
      if (!val.motherPhone) {
        ctx.addIssue({ code: "custom", path: ["motherPhone"], message: "İletişim velisi Anne seçildi; anne GSM zorunludur." });
      }
    } else if (val.contactParentType === "baba") {
      if (!val.fatherFullName) {
        ctx.addIssue({ code: "custom", path: ["fatherFullName"], message: "İletişim velisi Baba seçildi; baba adı soyadı zorunludur." });
      }
      if (!val.fatherPhone) {
        ctx.addIssue({ code: "custom", path: ["fatherPhone"], message: "İletişim velisi Baba seçildi; baba GSM zorunludur." });
      }
    } else if (val.contactParentType === "diger") {
      if (!val.contactParentFullName) {
        ctx.addIssue({ code: "custom", path: ["contactParentFullName"], message: MSG.required("İletişim velisi adı soyadı") });
      }
      if (!val.contactParentPhone) {
        ctx.addIssue({ code: "custom", path: ["contactParentPhone"], message: MSG.required("İletişim velisi telefonu") });
      }
    }

    // En az bir veli (anne veya baba) eksiksiz olmalı; "Diğer" seçildiyse o kişi yeterlidir.
    if (!fatherComplete && !motherComplete && val.contactParentType !== "diger") {
      ctx.addIssue({
        code: "custom",
        path: ["motherFullName"],
        message: "Anne veya baba bilgilerinden en az biri (ad soyad + GSM) eksiksiz doldurulmalıdır.",
      });
    }
  })
  .transform((val) => ({
    ...val,
    // Anne/Baba seçildiğinde ayrı iletişim velisi alanları saklanmaz.
    contactParentFullName: val.contactParentType === "diger" ? val.contactParentFullName : null,
    contactParentPhone: val.contactParentType === "diger" ? val.contactParentPhone : null,
  }));

export type RegistrationInput = z.output<typeof registrationSchema>;


export type ValidationResult =
  | { success: true; data: RegistrationInput }
  | { success: false; errors: FieldErrors; formError?: string };

/** Bilinmeyen bir payload'ı form alanlarına indirger (fazla alanlar atılır, eksikler "" olur). */
export function coerceFormValues(payload: unknown): RegistrationFormValues {
  const values = emptyFormValues();
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const field of REGISTRATION_FIELDS) {
      const v = obj[field];
      if (typeof v === "string") values[field] = v;
      else if (typeof v === "number") values[field] = String(v);
    }
  }
  return values;
}

export function validateRegistration(values: RegistrationFormValues): ValidationResult {
  const parsed = registrationSchema.safeParse(values);
  if (parsed.success) return { success: true, data: parsed.data };

  const errors: FieldErrors = {};
  let formError: string | undefined;
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && REGISTRATION_FIELDS.includes(key as RegistrationField)) {
      const field = key as RegistrationField;
      // İlk hata mesajı gösterilir.
      if (!errors[field]) errors[field] = issue.message;
    } else if (!formError) {
      formError = issue.message;
    }
  }
  return { success: false, errors, formError };
}

/* ---------------- Yönetici düzenlemesi: eksik bilgiye izin verir ---------------- */

const optionalBirthDate = rawString()
  .transform((v) => v.trim())
  .refine((v) => v.length === 0 || (isValidIsoDate(v) && Number(v.slice(0, 4)) >= 1900), { error: MSG.birthDate })
  .refine((v) => v.length === 0 || !isFutureDate(v), { error: MSG.birthDateFuture });

const emptyToBlank = (label: string, max: number) => optionalText(label, max).transform((v) => v ?? "");
const phoneToBlank = optionalPhone.transform((v) => v ?? "");

/**
 * Panelden elle ekleme / düzenleme: yalnız öğrenci adı zorunlu, doldurulan alanlar biçim kontrolünden geçer.
 * Boş kalan alanlar kaydı "eksik bilgi" gösterir (completeness), kaydı engellemez.
 */
export const adminRegistrationSchema = z.object({
  studentTc: optionalTcFormat,
  studentFullName: requiredText("Öğrenci adı soyadı", 120),
  birthDate: optionalBirthDate,
  homeAddress: emptyToBlank("Ev adresi", 500),
  studentPhone: phoneToBlank,
  bloodGroup: rawString().refine((v) => v === "" || (BLOOD_GROUPS as readonly string[]).includes(v), { error: MSG.bloodGroup }),
  email: optionalEmail,
  fatherFullName: optionalText("Baba adı soyadı", 120),
  fatherTc: optionalTcFormat,
  fatherPhone: optionalPhone,
  motherFullName: optionalText("Anne adı soyadı", 120),
  motherTc: optionalTcFormat,
  motherPhone: optionalPhone,
  contactParentType: rawString().transform((v) => ((CONTACT_PARENT_TYPES as readonly string[]).includes(v) ? v : "diger")),
  contactParentFullName: optionalText("İletişim velisi adı soyadı", 120),
  contactParentPhone: optionalPhone,
  emergencyFullName: emptyToBlank("Acil durum kişisi adı soyadı", 120),
  emergencyRelation: emptyToBlank("Yakınlık durumu", 80),
  emergencyPhone: phoneToBlank,
});

export type AdminRegistrationInput = z.output<typeof adminRegistrationSchema>;

export type AdminValidationResult = { success: true; data: AdminRegistrationInput } | { success: false; errors: FieldErrors; formError?: string };

export function validateRegistrationAdmin(values: RegistrationFormValues): AdminValidationResult {
  const parsed = adminRegistrationSchema.safeParse(values);
  if (parsed.success) return { success: true, data: parsed.data };
  const errors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && REGISTRATION_FIELDS.includes(key as RegistrationField) && !errors[key as RegistrationField]) errors[key as RegistrationField] = issue.message;
  }
  return { success: false, errors, formError: "Lütfen işaretli alanları kontrol ediniz." };
}
