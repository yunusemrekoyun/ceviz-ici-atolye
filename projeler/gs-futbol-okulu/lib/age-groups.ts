import type { AgeGroup } from "@/lib/db/schema";

/** Client'ta da kullanılan yaş grubu yardımcıları. */
export type AgeGroupView = Pick<AgeGroup, "id" | "name" | "minBirthYear" | "maxBirthYear">;

export function birthYearOf(isoBirthDate: string): number | null {
  const year = Number(isoBirthDate.slice(0, 4));
  return Number.isInteger(year) && year > 1900 ? year : null;
}

export function findGroupForBirthDate<T extends AgeGroupView>(groups: T[], isoBirthDate: string): T | null {
  const year = birthYearOf(isoBirthDate);
  if (year === null) return null;
  return groups.find((g) => year >= g.minBirthYear && year <= g.maxBirthYear) ?? null;
}

export function formatYearRange(group: Pick<AgeGroupView, "minBirthYear" | "maxBirthYear">): string {
  return group.minBirthYear === group.maxBirthYear
    ? String(group.minBirthYear)
    : `${group.minBirthYear}–${group.maxBirthYear}`;
}

/** Gruplar küçük yaştan büyüğe (doğum yılı yeniden eskiye) sıralanır. */
export function sortGroups<T extends AgeGroupView>(groups: T[]): T[] {
  return [...groups].sort((a, b) => b.maxBirthYear - a.maxBirthYear || a.name.localeCompare(b.name, "tr"));
}

type GroupSource = { status: string; birthDate: string; groupId: number | null };

/**
 * Bir kaydın grubu: öğrencide atanmış grup; diğerlerinde doğum yılından önerilen grup;
 * doğum tarihi bilinmiyorsa (eksik bilgili kayıt) elle seçilen grup.
 */
export function effectiveGroup<T extends AgeGroupView>(reg: GroupSource, groups: T[]): { group: T | null; suggested: boolean } {
  const byId = (id: number | null) => (id ? (groups.find((g) => g.id === id) ?? null) : null);
  if (reg.status === "enrolled") return { group: byId(reg.groupId), suggested: false };
  const fromBirth = findGroupForBirthDate(groups, reg.birthDate);
  if (fromBirth) return { group: fromBirth, suggested: true };
  return { group: byId(reg.groupId), suggested: false };
}
