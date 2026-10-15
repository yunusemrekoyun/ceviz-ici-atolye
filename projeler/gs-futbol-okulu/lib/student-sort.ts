/**
 * Öğrenci listelerinin sıralaması (Öğrenciler sayfası ve grup sayfası). Tarayıcıda da çalışır; adres `?sira=`.
 */
export type StudentSort = "ad" | "no" | "yas" | "yeni" | "grup" | "odeme" | "devam";

/** billing: aidat izni gerekir · attendance: yalnız devam bilgisi olan listede (grup sayfası) · multiGroup: birden çok grup varsa. */
export const STUDENT_SORTS: { key: StudentSort; label: string; billing?: boolean; attendance?: boolean; multiGroup?: boolean }[] = [
  { key: "ad", label: "Ada göre (A–Z)" },
  { key: "no", label: "Öğrenci numarasına göre" },
  { key: "yas", label: "Yaşa göre (küçükten büyüğe)" },
  { key: "yeni", label: "Son kayıt olan önce" },
  { key: "grup", label: "Gruba göre", multiGroup: true },
  { key: "odeme", label: "Ödeme durumuna göre", billing: true },
  { key: "devam", label: "Devama göre (az gelen önce)", attendance: true },
];

export function isStudentSort(v: unknown): v is StudentSort {
  return STUDENT_SORTS.some((s) => s.key === v);
}

type Sortable = { id: number; studentFullName: string; studentNo: number | null; birthDate: string | null; enrolledAt: string | null };

/**
 * Karşılaştırıcı. `groupRank` küçükten büyüğe grup sırası (yaş gruplarının listesindeki yeri), `payRank` ödeme
 * durumunun aciliyeti (gecikti önce). Eşitlikte hep ada göre.
 */
export function studentComparator<T extends Sortable>(
  sort: StudentSort,
  ctx: { groupRank?: (r: T) => number; payRank?: (r: T) => number; attendanceRate?: (r: T) => number | null } = {},
): (a: T, b: T) => number {
  const byName = (a: T, b: T) => a.studentFullName.localeCompare(b.studentFullName, "tr");
  const last = Number.MAX_SAFE_INTEGER;
  switch (sort) {
    case "no":
      return (a, b) => (a.studentNo ?? last) - (b.studentNo ?? last) || byName(a, b);
    case "yas":
      // Küçükten büyüğe: doğum tarihi yeni olan önce; doğum tarihi olmayan sonda
      return (a, b) => (b.birthDate ?? "").localeCompare(a.birthDate ?? "") || byName(a, b);
    case "yeni":
      return (a, b) => (b.enrolledAt ?? "").localeCompare(a.enrolledAt ?? "") || byName(a, b);
    case "grup":
      return (a, b) => (ctx.groupRank?.(a) ?? last) - (ctx.groupRank?.(b) ?? last) || byName(a, b);
    case "odeme":
      return (a, b) => (ctx.payRank?.(a) ?? last) - (ctx.payRank?.(b) ?? last) || byName(a, b);
    case "devam":
      // Az gelen önce; hiç yoklaması olmayan sonda
      return (a, b) => (ctx.attendanceRate?.(a) ?? 101) - (ctx.attendanceRate?.(b) ?? 101) || byName(a, b);
    default:
      return byName;
  }
}
