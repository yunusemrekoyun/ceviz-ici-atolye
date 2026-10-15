import type { Registration } from "@/lib/db/schema";
import { birthYearOf } from "@/lib/age-groups";

/**
 * Asıl kayıt için gereken ama kayıtta boş olan bilgiler. Panelden hızlı eklenen (eksik bilgili) kayıtlar
 * burada listelenen alanlar doldurulunca kendiliğinden "tam" sayılır; ayrı bir bayrak tutulmaz.
 */
export function missingFields(reg: Registration): string[] {
  const missing: string[] = [];
  if (!reg.studentTc) missing.push("T.C. Kimlik No");
  if (!reg.birthDate || birthYearOf(reg.birthDate) === null) missing.push("Doğum tarihi");
  if (!reg.homeAddress) missing.push("Ev adresi");
  if (!reg.studentPhone) missing.push("İrtibat telefonu");
  if (!reg.bloodGroup) missing.push("Kan grubu");
  const parentOk = Boolean((reg.motherFullName && reg.motherPhone) || (reg.fatherFullName && reg.fatherPhone));
  if (!parentOk) missing.push("Anne/baba bilgisi");
  if (!reg.emergencyFullName || !reg.emergencyPhone) missing.push("Acil durum kişisi");
  return missing;
}
