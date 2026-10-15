import type { RegistrationDto } from "@/lib/api";
import { formatDateTr } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";
import { isValidTcKimlikNo } from "@/lib/tc";
import type { RegistrationField } from "@/lib/registration-fields";

/**
 * Kayıttaki bozuk ya da şüpheli bilgiler ve her birinin tek tıkla düzeltileceği yer.
 * Client'tan da kullanılır (DB bağımlılığı yok); olası tekrar ve veliden gelen güncelleme DTO'dan okunur.
 *
 * - error: bozuk (geçersiz T.C./telefon, şüpheli doğum tarihi, grubu olmayan öğrenci, ulaşılacak telefon yok)
 * - warn: kontrol edilmeli (olası tekrar, geçersiz e-posta)
 * - info: tamamlanacak (veliden gelen güncel bilgi, eksik bilgi)
 */
export type IssueFix =
  | { kind: "field"; field: RegistrationField }
  | { kind: "group" }
  | { kind: "merge"; otherId: number }
  | { kind: "submission" };

export type Issue = { key: string; type: IssueType; severity: "error" | "warn" | "info"; label: string; detail?: string; fix: IssueFix };

export const ISSUE_TYPES = {
  tc: "Geçersiz T.C.",
  phone: "Geçersiz telefon",
  noPhone: "Ulaşılacak telefon yok",
  birth: "Şüpheli doğum tarihi",
  group: "Grubu olmayan öğrenci",
  duplicate: "Olası tekrar kayıt",
  email: "Geçersiz e-posta",
  submission: "Veliden gelen güncel bilgi",
  missing: "Eksik bilgi",
} as const;
export type IssueType = keyof typeof ISSUE_TYPES;

const TC_FIELDS = [
  ["studentTc", "Öğrenci T.C."],
  ["fatherTc", "Baba T.C."],
  ["motherTc", "Anne T.C."],
] as const;

const PHONE_FIELDS = [
  ["studentPhone", "İrtibat telefonu"],
  ["fatherPhone", "Baba telefonu"],
  ["motherPhone", "Anne telefonu"],
  ["contactParentPhone", "İletişim velisi telefonu"],
  ["emergencyPhone", "Acil durum telefonu"],
] as const;

/** Eksik bilgi etiketi → formda ilk ilgili alan. */
const MISSING_FIELD: Record<string, RegistrationField> = {
  "T.C. Kimlik No": "studentTc",
  "Doğum tarihi": "birthDate",
  "Ev adresi": "homeAddress",
  "İrtibat telefonu": "studentPhone",
  "Kan grubu": "bloodGroup",
  "Anne/baba bilgisi": "motherFullName",
  "Acil durum kişisi": "emergencyFullName",
};

const MIN_AGE = 3;
const MAX_AGE = 18;

export function issuesOf(reg: RegistrationDto, others?: Map<number, Pick<RegistrationDto, "studentFullName">>): Issue[] {
  const out: Issue[] = [];
  const active = reg.status !== "cancelled";

  for (const [field, label] of TC_FIELDS) {
    const v = reg[field];
    if (v && !isValidTcKimlikNo(v)) out.push({ key: `tc:${field}`, type: "tc", severity: "error", label: `${label} geçersiz`, detail: v, fix: { kind: "field", field } });
  }
  for (const [field, label] of PHONE_FIELDS) {
    const v = reg[field];
    if (v && !normalizePhone(v)) out.push({ key: `phone:${field}`, type: "phone", severity: "error", label: `${label} geçersiz`, detail: v, fix: { kind: "field", field } });
  }
  if (active && !reg.contact.phone) {
    const field: RegistrationField = reg.contactParentType === "anne" ? "motherPhone" : reg.contactParentType === "baba" ? "fatherPhone" : "contactParentPhone";
    out.push({ key: "noPhone", type: "noPhone", severity: "error", label: `İletişim velisinin telefonu yok`, detail: reg.contact.typeLabel, fix: { kind: "field", field } });
  }
  if (reg.birthDate && (reg.age === null || reg.age < MIN_AGE || reg.age > MAX_AGE))
    out.push({ key: "birth", type: "birth", severity: "error", label: "Doğum tarihi şüpheli", detail: `${formatDateTr(reg.birthDate)}${reg.age !== null ? ` · ${reg.age} yaş` : ""}`, fix: { kind: "field", field: "birthDate" } });
  if (reg.status === "enrolled" && !reg.groupId) out.push({ key: "group", type: "group", severity: "error", label: "Öğrencinin grubu yok", detail: reg.birthDate ? undefined : "doğum tarihi de yok", fix: { kind: "group" } });
  if (reg.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reg.email)) out.push({ key: "email", type: "email", severity: "warn", label: "E-posta geçersiz", detail: reg.email, fix: { kind: "field", field: "email" } });
  for (const otherId of reg.duplicates ?? [])
    out.push({ key: `dup:${otherId}`, type: "duplicate", severity: "warn", label: "Olası tekrar kayıt", detail: others?.get(otherId)?.studentFullName, fix: { kind: "merge", otherId } });
  if (reg.submission) out.push({ key: "submission", type: "submission", severity: "info", label: "Veliden güncel bilgi geldi", detail: formatDateTr(reg.submission.createdAt.slice(0, 10)), fix: { kind: "submission" } });
  if (active && reg.missing.length)
    out.push({ key: "missing", type: "missing", severity: "info", label: "Eksik bilgi", detail: reg.missing.join(", "), fix: { kind: "field", field: MISSING_FIELD[reg.missing[0]!] ?? "studentTc" } });
  return out;
}

/** Bozuk sayılan (düzeltilmesi gereken) sorunlar. */
export const isBroken = (i: Issue) => i.severity === "error";

/** Bilgiler tamam: eksik alan yok ve bozuk veri yok (listelerde ve dosyada yeşil rozet). */
export function isInfoComplete(reg: RegistrationDto): boolean {
  return reg.missing.length === 0 && !issuesOf(reg).some(isBroken);
}

/** Tek tıkla düzeltme adresi (alan düzenleme sayfasında odaklanır). */
export function fixHref(regId: number, fix: IssueFix): string | null {
  if (fix.kind === "field") return `/admin/kayit/${regId}/duzenle?alan=${fix.field}`;
  if (fix.kind === "group") return `/admin/kayit/${regId}/asil-kayit`;
  return null;
}
