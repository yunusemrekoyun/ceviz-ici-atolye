import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { drills, evaluations, measurements, registrations, sessionDrills, testDefinitions, testResults, type Drill, type Evaluation, type Measurement, type TestDefinition, type TestResult } from "@/lib/db/schema";

export class DevelopmentError extends Error {}

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Tarih seçin." });

function parseIds(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x)) : [];
  } catch {
    return [];
  }
}

/* ---------------- Ölçüm ---------------- */

export function recordMeasurement(input: { registrationId: number; measuredOn: string; heightCm: number | null; weightKg: number | null; userId: number | null }): void {
  if (input.heightCm === null && input.weightKg === null) return;
  getDb()
    .insert(measurements)
    .values({ registrationId: input.registrationId, measuredOn: input.measuredOn, heightCm: input.heightCm, weightKg: input.weightKg, createdBy: input.userId })
    .onConflictDoUpdate({ target: [measurements.registrationId, measurements.measuredOn], set: { heightCm: input.heightCm, weightKg: input.weightKg, createdBy: input.userId } })
    .run();
  // Kayıttaki güncel boy/kilo son ölçümü gösterir.
  const latest = getDb().select().from(measurements).where(eq(measurements.registrationId, input.registrationId)).orderBy(desc(measurements.measuredOn)).get();
  if (latest) getDb().update(registrations).set({ heightCm: latest.heightCm, weightKg: latest.weightKg }).where(eq(registrations.id, input.registrationId)).run();
}

export function measurementsOf(registrationId: number): Measurement[] {
  return getDb().select().from(measurements).where(eq(measurements.registrationId, registrationId)).orderBy(asc(measurements.measuredOn)).all();
}

/* ---------------- Test tanımları ---------------- */

export const testSchema = z.object({
  name: z.string().trim().min(2, { error: "Test adını yazın." }).max(60),
  unit: z.string().trim().min(1, { error: "Birim yazın (sn, cm, adet…)." }).max(15),
  higherBetter: z.boolean(),
  decimals: z.coerce.number().int().min(0).max(2),
  groupIds: z.array(z.number().int().positive()).max(50),
  description: z
    .string()
    .trim()
    .max(500)
    .transform((v) => v || null),
});

export type TestView = TestDefinition & { groups: number[] };

export function listTests(includeInactive = false): TestView[] {
  const q = getDb().select().from(testDefinitions);
  return (includeInactive ? q : q.where(eq(testDefinitions.active, true)))
    .orderBy(asc(testDefinitions.sort), asc(testDefinitions.name))
    .all()
    .map((t) => ({ ...t, groups: parseIds(t.groupIds) }));
}

export function testsForGroup(groupId: number | null): TestView[] {
  return listTests().filter((t) => t.groups.length === 0 || (groupId !== null && t.groups.includes(groupId)));
}

export function saveTest(id: number | null, input: z.infer<typeof testSchema>): TestDefinition {
  const values = { ...input, groupIds: input.groupIds.length ? JSON.stringify(input.groupIds) : null };
  const db = getDb();
  if (id === null) return db.insert(testDefinitions).values(values).returning().get();
  const row = db.update(testDefinitions).set(values).where(eq(testDefinitions.id, id)).returning().get();
  if (!row) throw new DevelopmentError("Test bulunamadı.");
  return row;
}

export function setTestActive(id: number, active: boolean): void {
  getDb().update(testDefinitions).set({ active }).where(eq(testDefinitions.id, id)).run();
}

/* ---------------- Sonuçlar ---------------- */

export function saveTestResults(testId: number, testedOn: string, values: { registrationId: number; value: number | null }[], userId: number): number {
  const db = getDb();
  let n = 0;
  db.transaction(() => {
    for (const v of values) {
      if (v.value === null) {
        db.delete(testResults).where(and(eq(testResults.testId, testId), eq(testResults.registrationId, v.registrationId), eq(testResults.testedOn, testedOn))).run();
        continue;
      }
      db.insert(testResults)
        .values({ testId, registrationId: v.registrationId, testedOn, value: v.value, createdBy: userId })
        .onConflictDoUpdate({ target: [testResults.testId, testResults.registrationId, testResults.testedOn], set: { value: v.value, createdBy: userId } })
        .run();
      n++;
    }
  });
  return n;
}

export function resultsOf(registrationIds: number[], testId?: number): TestResult[] {
  if (registrationIds.length === 0) return [];
  const conds = [inArray(testResults.registrationId, registrationIds)];
  if (testId) conds.push(eq(testResults.testId, testId));
  return getDb().select().from(testResults).where(and(...conds)).orderBy(asc(testResults.testedOn)).all();
}

/* ---------------- Değerlendirme ---------------- */

export const scoresSchema = z.record(z.string().max(40), z.number().int().min(1).max(5));

export function saveEvaluation(input: { registrationId: number; evaluatedOn: string; scores: Record<string, number>; comment: string | null; userId: number }): Evaluation {
  return getDb()
    .insert(evaluations)
    .values({ registrationId: input.registrationId, evaluatedOn: input.evaluatedOn, scores: JSON.stringify(input.scores), comment: input.comment, createdBy: input.userId })
    .returning()
    .get();
}

export function deleteEvaluation(id: number): void {
  getDb().delete(evaluations).where(eq(evaluations.id, id)).run();
}

export type EvaluationView = Omit<Evaluation, "scores"> & { scores: Record<string, number> };

export function evaluationsOf(registrationId: number): EvaluationView[] {
  return getDb()
    .select()
    .from(evaluations)
    .where(eq(evaluations.registrationId, registrationId))
    .orderBy(desc(evaluations.evaluatedOn), desc(evaluations.id))
    .all()
    .map((e) => {
      let scores: Record<string, number> = {};
      try {
        const p = scoresSchema.safeParse(JSON.parse(e.scores));
        if (p.success) scores = p.data;
      } catch {
        // bozuk kayıt boş gösterilir
      }
      return { ...e, scores };
    });
}

/* ---------------- Gelişim özeti (GEL-05) ---------------- */

export type TestProgress = {
  test: TestView;
  series: { date: string; value: number }[];
  first: number | null;
  latest: number | null;
  change: number | null;
  /** İyileşme yönünde mi (test "yüksek iyi" / "düşük iyi" tanımına göre). */
  improved: boolean | null;
  groupAverage: number | null;
};

export type Progress = {
  measurements: Measurement[];
  tests: TestProgress[];
  evaluations: EvaluationView[];
};

/** Öğrencinin gelişimi: ilk ölçüme göre değişim ve grubunun son değer ortalaması. */
export function progressOf(registrationId: number): Progress {
  const db = getDb();
  const reg = db.select({ groupId: registrations.groupId }).from(registrations).where(eq(registrations.id, registrationId)).get();
  const groupmates = reg?.groupId
    ? db
        .select({ id: registrations.id })
        .from(registrations)
        .where(and(eq(registrations.groupId, reg.groupId), eq(registrations.status, "enrolled")))
        .all()
        .map((r) => r.id)
    : [];
  const own = resultsOf([registrationId]);
  const groupResults = resultsOf(groupmates);
  const tests = listTests(true)
    .filter((t) => own.some((r) => r.testId === t.id))
    .map((test): TestProgress => {
      const series = own.filter((r) => r.testId === test.id).map((r) => ({ date: r.testedOn, value: r.value }));
      const first = series[0]?.value ?? null;
      const latest = series.at(-1)?.value ?? null;
      const change = first !== null && latest !== null && series.length > 1 ? latest - first : null;
      const latestByStudent = new Map<number, number>();
      for (const r of groupResults.filter((x) => x.testId === test.id)) latestByStudent.set(r.registrationId, r.value);
      const vals = [...latestByStudent.values()];
      return {
        test,
        series,
        first,
        latest,
        change,
        improved: change === null || change === 0 ? null : test.higherBetter ? change > 0 : change < 0,
        groupAverage: vals.length >= 3 ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
      };
    });
  return { measurements: measurementsOf(registrationId), tests, evaluations: evaluationsOf(registrationId) };
}

/* ---------------- Drill kütüphanesi ---------------- */

export const DRILL_CATEGORIES = { teknik: "Teknik", taktik: "Taktik", kondisyon: "Kondisyon", oyun: "Oyun" } as const;

export const drillSchema = z.object({
  name: z.string().trim().min(2, { error: "Drill adını yazın." }).max(80),
  category: z.enum(Object.keys(DRILL_CATEGORIES) as [keyof typeof DRILL_CATEGORIES, ...(keyof typeof DRILL_CATEGORIES)[]]),
  description: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => v || null),
});

export function listDrills(includeInactive = false): Drill[] {
  const q = getDb().select().from(drills);
  return (includeInactive ? q : q.where(eq(drills.active, true))).orderBy(asc(drills.category), asc(drills.name)).all();
}

export function saveDrill(id: number | null, input: z.infer<typeof drillSchema>): Drill {
  const db = getDb();
  if (id === null) return db.insert(drills).values(input).returning().get();
  const row = db.update(drills).set(input).where(eq(drills.id, id)).returning().get();
  if (!row) throw new DevelopmentError("Drill bulunamadı.");
  return row;
}

export function setDrillActive(id: number, active: boolean): void {
  getDb().update(drills).set({ active }).where(eq(drills.id, id)).run();
}

export function sessionDrillIds(sessionId: number): number[] {
  return getDb().select({ id: sessionDrills.drillId }).from(sessionDrills).where(eq(sessionDrills.sessionId, sessionId)).all().map((r) => r.id);
}

export function setSessionDrills(sessionId: number, drillIds: number[]): void {
  const db = getDb();
  db.transaction(() => {
    db.delete(sessionDrills).where(eq(sessionDrills.sessionId, sessionId)).run();
    const unique = [...new Set(drillIds)];
    if (unique.length) db.insert(sessionDrills).values(unique.map((drillId) => ({ sessionId, drillId }))).run();
  });
}

export { day as daySchema };
