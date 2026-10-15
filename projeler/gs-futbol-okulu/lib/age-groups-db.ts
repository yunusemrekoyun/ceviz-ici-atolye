import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { ageGroups, type AgeGroup } from "@/lib/db/schema";
import { formatYearRange, sortGroups } from "@/lib/age-groups";
import { tidyName } from "@/lib/format";

export class AgeGroupError extends Error {}

/** Etkin gruplar (birleşen ya da silinen arşivdeki gruplar hariç). */
export function listAgeGroups(): AgeGroup[] {
  return sortGroups(getDb().select().from(ageGroups).where(isNull(ageGroups.archivedAt)).all());
}

const currentYear = () => new Date().getFullYear();

export const ageGroupInputSchema = z
  .object({
    name: z
      .string()
      .transform(tidyName)
      .refine((v) => v.length > 0, { error: "Grup adı zorunludur." })
      .refine((v) => v.length <= 60, { error: "Grup adı en fazla 60 karakter olabilir." }),
    minBirthYear: z.coerce.number({ error: "Başlangıç yılı giriniz." }).int().min(1990, { error: "Geçerli bir yıl giriniz." }),
    maxBirthYear: z.coerce.number({ error: "Bitiş yılı giriniz." }).int().min(1990, { error: "Geçerli bir yıl giriniz." }),
  })
  .refine((v) => v.minBirthYear <= v.maxBirthYear, { error: "Başlangıç yılı bitiş yılından büyük olamaz.", path: ["maxBirthYear"] })
  .refine((v) => v.maxBirthYear <= currentYear(), { error: "Doğum yılı gelecekte olamaz.", path: ["maxBirthYear"] });

export type AgeGroupInput = z.output<typeof ageGroupInputSchema>;

function assertNoOverlap(input: AgeGroupInput, excludeId?: number): void {
  const db = getDb();
  const active = isNull(ageGroups.archivedAt);
  const others = db.select().from(ageGroups).where(excludeId === undefined ? active : and(active, ne(ageGroups.id, excludeId))).all();
  const clash = others.find((g) => input.minBirthYear <= g.maxBirthYear && input.maxBirthYear >= g.minBirthYear);
  if (clash) {
    throw new AgeGroupError(`Bu aralık "${clash.name}" (${formatYearRange(clash)}) ile çakışıyor. Bir doğum yılı yalnızca bir gruba ait olabilir.`);
  }
}

export function createAgeGroup(input: AgeGroupInput): AgeGroup {
  assertNoOverlap(input);
  return getDb().insert(ageGroups).values(input).returning().get();
}

export function updateAgeGroup(id: number, input: AgeGroupInput): AgeGroup {
  assertNoOverlap(input, id);
  const updated = getDb()
    .update(ageGroups)
    .set({ ...input, updatedAt: new Date().toISOString() })
    .where(and(eq(ageGroups.id, id), isNull(ageGroups.archivedAt)))
    .returning()
    .get();
  if (!updated) throw new AgeGroupError("Grup bulunamadı.");
  return updated;
}
