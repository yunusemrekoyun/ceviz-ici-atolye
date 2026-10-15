import type { RegistrationDto } from "@/lib/api";

/** Türkçe karakterleri sadeleştirip küçük harfe çevirir: "Yılmaz" ve "yilmaz" aynı eşleşir. */
export function normalizeForSearch(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Arama: öğrenci adı, öğrenci TC, anne adı, baba adı, telefonlar ve e-mail üzerinde çalışır.
 * Rakam içeren sorgular telefon/TC için sadece rakamlarla karşılaştırılır.
 */
export function matchesSearch(reg: RegistrationDto, rawQuery: string): boolean {
  const query = normalizeForSearch(rawQuery);
  if (!query) return true;

  const textHaystack = [
    reg.studentFullName,
    reg.motherFullName ?? "",
    reg.fatherFullName ?? "",
    reg.contactParentFullName ?? "",
    reg.email ?? "",
  ]
    .map(normalizeForSearch)
    .join(" | ");

  if (textHaystack.includes(query)) return true;

  const queryDigits = rawQuery.replace(/\D/g, "");
  if (reg.studentNo && queryDigits === String(reg.studentNo)) return true;
  if (queryDigits.length >= 3) {
    const digitFields = [
      reg.studentTc ?? "",
      reg.studentPhone,
      reg.motherPhone ?? "",
      reg.fatherPhone ?? "",
      reg.contactParentPhone ?? "",
      reg.emergencyPhone ?? "",
    ];
    // "+90 555..." veya "555..." şeklinde aranırsa 0'sız/ülke kodsuz halleriyle de eşleştir.
    const variants = new Set([queryDigits]);
    if (queryDigits.startsWith("90") && queryDigits.length > 10) variants.add("0" + queryDigits.slice(2));
    if (queryDigits.startsWith("5") && queryDigits.length <= 10) variants.add("0" + queryDigits);
    for (const field of digitFields) {
      for (const v of variants) if (field.includes(v)) return true;
    }
  }
  return false;
}
