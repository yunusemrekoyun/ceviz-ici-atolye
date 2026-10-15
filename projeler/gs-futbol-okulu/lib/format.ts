import type { Registration } from "@/lib/db/schema";
import { CONTACT_PARENT_LABELS, type ContactParentType } from "@/lib/constants";

/** ISO "YYYY-MM-DD" -> "GG.AA.YYYY" */
export function formatDateTr(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) return isoDate;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

/** ISO 8601 zaman damgası -> "GG.AA.YYYY SS:DD" (Türkiye saati) */
export function formatDateTimeTr(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** "YYYY-MM-DD" doğum tarihinden tam yaş hesaplar. Geçersiz tarihte null döner. */
export function computeAge(isoBirthDate: string, now: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoBirthDate);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  let age = now.getFullYear() - year;
  const hadBirthdayThisYear =
    now.getMonth() + 1 > month || (now.getMonth() + 1 === month && now.getDate() >= day);
  if (!hadBirthdayThisYear) age -= 1;
  return age < 0 ? null : age;
}

/** Doğum tarihi ISO string'ini JS Date'e çevirir (Excel tarih hücresi için). */
export function isoDateToDate(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function contactParentTypeLabel(type: string): string {
  return CONTACT_PARENT_LABELS[type as ContactParentType] ?? type;
}

export type ResolvedContactParent = {
  typeLabel: string;
  fullName: string;
  phone: string;
};

/**
 * "İletişimde olunacak veli" seçimine göre gerçek ad/telefon bilgisini çözer.
 * Anne/Baba seçildiyse ilgili bloktaki bilgiler, Diğer seçildiyse ayrı girilen bilgiler kullanılır.
 */
export function resolveContactParent(reg: Registration): ResolvedContactParent {
  const typeLabel = contactParentTypeLabel(reg.contactParentType);
  switch (reg.contactParentType) {
    case "anne":
      return { typeLabel, fullName: reg.motherFullName ?? "", phone: reg.motherPhone ?? "" };
    case "baba":
      return { typeLabel, fullName: reg.fatherFullName ?? "", phone: reg.fatherPhone ?? "" };
    default:
      return {
        typeLabel,
        fullName: reg.contactParentFullName ?? "",
        phone: reg.contactParentPhone ?? "",
      };
  }
}

/** Kişi adlarını "Ahmet Yılmaz" gibi toparlar: fazla boşlukları temizler. */
export function tidyName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/*
 * Randevu saatleri Türkiye saatiyle girilir ve gösterilir. Türkiye 2016'dan beri sabit UTC+3 (yaz saati yok).
 */
const ISTANBUL_OFFSET = "+03:00";

/** <input type="datetime-local"> değeri ("YYYY-MM-DDTHH:MM", İstanbul saati) → ISO UTC. Geçersizse null. */
export function istanbulLocalToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00${ISTANBUL_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function istanbulParts(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour") === "24" ? "00" : get("hour"), min: get("minute") };
}

/** ISO UTC → datetime-local input değeri (İstanbul saati). */
export function isoToIstanbulLocal(iso: string | null | undefined): string {
  const p = iso ? istanbulParts(iso) : null;
  return p ? `${p.y}-${p.m}-${p.d}T${p.h}:${p.min}` : "";
}

/** ISO UTC → İstanbul takvim günü "YYYY-MM-DD" (gruplama/karşılaştırma için). */
export function istanbulDayKey(iso: string | Date): string {
  const p = istanbulParts(typeof iso === "string" ? iso : iso.toISOString());
  return p ? `${p.y}-${p.m}-${p.d}` : "";
}

/** "YYYY-MM-DD" → "23 Eylül Çarşamba" */
export function formatDayLongTr(dayKey: string): string {
  const date = new Date(`${dayKey}T12:00:00${ISTANBUL_OFFSET}`);
  if (Number.isNaN(date.getTime())) return dayKey;
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long", weekday: "long" }).format(date);
}

/** ISO → "14:30" (İstanbul saati) */
export function formatTimeTr(iso: string | null | undefined): string {
  const p = iso ? istanbulParts(iso) : null;
  return p ? `${p.h}:${p.min}` : "";
}
