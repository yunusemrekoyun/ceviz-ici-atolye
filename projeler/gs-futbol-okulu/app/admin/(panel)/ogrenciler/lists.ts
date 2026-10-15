import type { RegistrationDto } from "@/lib/api";
import { issuesOf } from "@/lib/data-issues";
import { addDaysTo } from "@/lib/dates";
import type { StudentInsight } from "@/lib/insights";

/**
 * Öğrenci listesinin hazır süzgeçleri ("kimi aramalıyım?" soruları). Raporlar'daki kısayollar ve Öğrenciler
 * sayfası aynı tanımı kullanır; adres `?liste=`.
 */
export type StudentListKey = "hepsi" | "aidat" | "yenileme" | "soz" | "forma" | "forma-para" | "az-gelen" | "eksik" | "kaleci";

export const STUDENT_LISTS: { key: StudentListKey; label: string; hint: string; billing?: boolean; tone: "bad" | "warn" | "neutral" }[] = [
  { key: "hepsi", label: "Tümü", hint: "", tone: "warn" },
  { key: "aidat", label: "Aidatı gelmeyen", hint: "Hakkı yok ya da aidatı bekleniyor", billing: true, tone: "bad" },
  { key: "yenileme", label: "Ödemesi yaklaşıyor", hint: "Ödedi; 7 gün içinde sonraki ödeme günü geliyor", billing: true, tone: "warn" },
  { key: "soz", label: "Ödeme sözü verenler", hint: "Söz verdiği güne kadar antrenmana devam ediyor", billing: true, tone: "warn" },
  { key: "forma", label: "Forması eksik", hint: "Forma kaydı girilmemiş", billing: true, tone: "bad" },
  { key: "forma-para", label: "Forma parası alınmadı", hint: "Forma ya da eşofman parası bekleniyor", billing: true, tone: "warn" },
  { key: "az-gelen", label: "Az geliyor", hint: "Seçili aralıkta devamı %60'ın altında", tone: "bad" },
  { key: "eksik", label: "Bilgisi eksik", hint: "T.C., adres, veli gibi bilgiler tamamlanacak", tone: "warn" },
  { key: "kaleci", label: "Kaleciler", hint: "Kaleci olarak işaretlenen öğrenciler", tone: "neutral" },
];

export function isStudentListKey(v: unknown): v is StudentListKey {
  return STUDENT_LISTS.some((l) => l.key === v);
}

export function inStudentList(key: StudentListKey, r: RegistrationDto, i: StudentInsight | undefined, today: string): boolean {
  switch (key) {
    case "hepsi":
      return true;
    case "aidat":
      return i?.access === "grace" || i?.access === "locked";
    case "yenileme":
      return i?.access === "paid" && Boolean(i.paidUntil) && i.paidUntil! <= addDaysTo(today, 7);
    case "soz":
      return i?.access === "override" || Boolean(i?.promiseMissed);
    case "forma":
      return i?.kit === "none";
    case "forma-para":
      return i?.kit === "unpaid";
    case "az-gelen":
      return i !== undefined && i.attendanceRate !== null && i.attendanceRate < 60 && i.attended >= 3;
    case "eksik":
      return r.missing.length > 0 || issuesOf(r).some((x) => x.severity === "error");
    case "kaleci":
      return r.isGoalkeeper;
  }
}

export function studentListCounts(rows: RegistrationDto[], insights: Record<number, StudentInsight>, today: string): Record<StudentListKey, number> {
  const out = Object.fromEntries(STUDENT_LISTS.map((l) => [l.key, 0])) as Record<StudentListKey, number>;
  for (const r of rows) for (const l of STUDENT_LISTS) if (inStudentList(l.key, r, insights[r.id], today)) out[l.key]++;
  return out;
}
