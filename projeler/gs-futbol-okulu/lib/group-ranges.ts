import { and, eq, gte, isNull, notInArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { ageGroups, attendance, groupCoaches, groupSchedules, registrations, trainingSessions, users, type AgeGroup } from "@/lib/db/schema";
import { birthYearOf, effectiveGroup, formatYearRange, type AgeGroupView } from "@/lib/age-groups";
import { AgeGroupError, listAgeGroups, type AgeGroupInput } from "@/lib/age-groups-db";
import { changeGroupKeepingRights, invalidatePeriodCache, todayKey } from "@/lib/billing";
import { deleteSchedule, invalidateSessionWindow, WEEKDAYS } from "@/lib/program";

/**
 * Bir grubun doğum yılı aralığı değişince (ya da yeni grup eklenince) diğer gruplara ve öğrencilere ne olacağı.
 * Aralık başka bir grubun bütün yıllarını kapsıyorsa o grup bu gruba katılır (birleşme); bir ucunu kapsıyorsa
 * o grup daralır ve o yıllardaki öğrencileri bu gruba geçer. Böylece "2011–2012 ile 2013–2014 aynı grup olsun"
 * demek için tek grubun aralığını 2011–2014 yapmak yeter.
 */

export type PlanStudent = { id: number; name: string; year: number | null };

export type RangePlan = {
  /** Birleşen gruplar: öğrencileri bu gruba geçer, grup listelerden kalkar (geçmişi kalır). */
  merged: { id: number; name: string; years: string; students: PlanStudent[]; coaches: string[]; schedule: string | null }[];
  /** Bir ucu bu gruba geçen gruplar ve oradan gelen öğrenciler. */
  trimmed: { id: number; name: string; years: string; newYears: string; givenYears: string; minBirthYear: number; maxBirthYear: number; students: PlanStudent[] }[];
  /** Daha önce hiçbir grubun yaşında olmayan, artık bu gruba giren öğrenciler. */
  adopted: PlanStudent[];
  /** Bu grubun yeni aralığın dışında kalan öğrencileri (başka gruba da düşmez, grubunda kalır). */
  leaving: PlanStudent[];
  /** Bu grupta yeni görünecek aday sayısı. */
  candidates: number;
  /** Bu grubun programı ("Cumartesi 10:00, Pazar 10:00"); yoksa null. */
  schedule: string | null;
  /** Bu grubun programı yoksa programı devralınacak birleşen grup. */
  takeoverFrom: number | null;
};

type Range = Pick<AgeGroupInput, "minBirthYear" | "maxBirthYear">;
type Person = { id: number; studentFullName: string; birthDate: string; groupId: number | null; status: string };

const CANDIDATE = new Set(["pending", "scheduled", "no_show"]);
/** Yeni grup için geçici kimlik. */
const NEW_ID = -1;

/** Onay gerektiren bir etkisi var mı (yalnız aday değişimi sessizce uygulanır). */
export function needsConfirm(plan: Pick<RangePlan, "merged" | "trimmed" | "adopted" | "leaving">): boolean {
  return plan.merged.length + plan.trimmed.length + plan.adopted.length + plan.leaving.length > 0;
}

/** Saf hesap: hiçbir şey yazmaz. Bir grubu ikiye bölen aralık reddedilir. */
export function planRangeChange(groups: AgeGroupView[], people: Person[], targetId: number | null, next: Range): Omit<RangePlan, "schedule" | "takeoverFrom"> {
  const target = targetId === null ? null : (groups.find((g) => g.id === targetId) ?? null);
  if (targetId !== null && !target) throw new AgeGroupError("Grup bulunamadı.");
  const inNext = (y: number | null) => y !== null && y >= next.minBirthYear && y <= next.maxBirthYear;

  const merged: AgeGroupView[] = [];
  const trimmed: { group: AgeGroupView; minBirthYear: number; maxBirthYear: number }[] = [];
  for (const g of groups) {
    if (g.id === targetId || next.maxBirthYear < g.minBirthYear || next.minBirthYear > g.maxBirthYear) continue;
    const low = next.minBirthYear <= g.minBirthYear;
    const high = next.maxBirthYear >= g.maxBirthYear;
    if (low && high) merged.push(g);
    else if (low) trimmed.push({ group: g, minBirthYear: next.maxBirthYear + 1, maxBirthYear: g.maxBirthYear });
    else if (high) trimmed.push({ group: g, minBirthYear: g.minBirthYear, maxBirthYear: next.minBirthYear - 1 });
    else
      throw new AgeGroupError(
        `Bu aralık "${g.name}" (${formatYearRange(g)}) grubunu ikiye bölüyor. Önce o grubun aralığını daraltın ya da bu grubun aralığını onu tamamen kapsayacak şekilde genişletin.`,
      );
  }

  const coveredBefore = (y: number) => groups.some((g) => y >= g.minBirthYear && y <= g.maxBirthYear);
  const student = (r: Person): PlanStudent => ({ id: r.id, name: r.studentFullName, year: birthYearOf(r.birthDate) });
  const enrolled = people.filter((r) => r.status === "enrolled");
  const mergedIds = new Set(merged.map((g) => g.id));
  const trimmedIds = new Set(trimmed.map((t) => t.group.id));

  const adopted = enrolled.filter((r) => {
    if (r.groupId === targetId || (r.groupId !== null && (mergedIds.has(r.groupId) || trimmedIds.has(r.groupId)))) return false;
    const y = birthYearOf(r.birthDate);
    return y !== null && inNext(y) && !coveredBefore(y);
  });
  const leaving = target
    ? enrolled.filter((r) => {
        const y = birthYearOf(r.birthDate);
        return r.groupId === target.id && y !== null && y >= target.minBirthYear && y <= target.maxBirthYear && !inNext(y);
      })
    : [];

  // Adaylar: önce ve sonra hangi grupta görünüyorlar
  const after: AgeGroupView[] = [
    ...groups.filter((g) => g.id !== targetId && !mergedIds.has(g.id)).map((g) => {
      const t = trimmed.find((x) => x.group.id === g.id);
      return t ? { ...g, minBirthYear: t.minBirthYear, maxBirthYear: t.maxBirthYear } : g;
    }),
    { id: targetId ?? NEW_ID, name: target?.name ?? "", ...next },
  ];
  const tid = targetId ?? NEW_ID;
  const candidates = people.filter((r) => {
    if (!CANDIDATE.has(r.status)) return false;
    const before = effectiveGroup(r, groups).group?.id;
    const moved = { ...r, groupId: r.groupId !== null && mergedIds.has(r.groupId) ? tid : r.groupId };
    return before !== tid && effectiveGroup(moved, after).group?.id === tid;
  }).length;

  return {
    merged: merged.map((g) => ({
      id: g.id,
      name: g.name,
      years: formatYearRange(g),
      students: enrolled.filter((r) => r.groupId === g.id).map(student),
      coaches: [],
      schedule: null,
    })),
    trimmed: trimmed.map((t) => ({
      id: t.group.id,
      name: t.group.name,
      years: formatYearRange(t.group),
      newYears: formatYearRange(t),
      givenYears: formatYearRange({ minBirthYear: Math.max(t.group.minBirthYear, next.minBirthYear), maxBirthYear: Math.min(t.group.maxBirthYear, next.maxBirthYear) }),
      minBirthYear: t.minBirthYear,
      maxBirthYear: t.maxBirthYear,
      students: enrolled.filter((r) => r.groupId === t.group.id && inNext(birthYearOf(r.birthDate))).map(student),
    })),
    adopted: adopted.map(student),
    leaving: leaving.map(student),
    candidates,
  };
}

/* ---------------- Veritabanı ---------------- */

function people(): Person[] {
  return getDb()
    .select({ id: registrations.id, studentFullName: registrations.studentFullName, birthDate: registrations.birthDate, groupId: registrations.groupId, status: registrations.status })
    .from(registrations)
    .all();
}

function scheduleText(groupId: number): string | null {
  const rows = getDb().select().from(groupSchedules).where(eq(groupSchedules.groupId, groupId)).all();
  if (!rows.length) return null;
  return rows
    .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime))
    .map((s) => `${WEEKDAYS[s.weekday - 1]} ${s.startTime}`)
    .join(", ");
}

function coachesOf(groupId: number): string[] {
  return getDb()
    .select({ name: users.fullName, username: users.username })
    .from(groupCoaches)
    .innerJoin(users, eq(groupCoaches.userId, users.id))
    .where(eq(groupCoaches.groupId, groupId))
    .all()
    .map((u) => u.name ?? u.username ?? "");
}

/** Kaydetmeden önce gösterilecek plan (antrenör ve program bilgisiyle). */
export function previewGroupRange(id: number | null, input: AgeGroupInput): RangePlan {
  const plan = planRangeChange(listAgeGroups(), people(), id, input);
  const merged = plan.merged.map((m) => ({ ...m, coaches: coachesOf(m.id), schedule: scheduleText(m.id) }));
  const schedule = id === null ? null : scheduleText(id);
  // Programı olmayan gruba, birleşen grupların en kalabalığının programı geçer
  const takeoverFrom = schedule ? null : ([...merged].filter((m) => m.schedule).sort((a, b) => b.students.length - a.students.length)[0]?.id ?? null);
  return { ...plan, merged, schedule, takeoverFrom };
}

/**
 * Planı tek işlemde uygular: daralan gruplar, bu grubun yeni aralığı, öğrenci taşımaları (hak paketleri korunarak),
 * birleşen grupların antrenörleri, adayları ve programı; en sonda birleşen gruplar arşive alınır.
 */
export function saveGroupRange(id: number | null, input: AgeGroupInput, today: string = todayKey()): { group: AgeGroup; plan: RangePlan } {
  const db = getDb();
  const result = db.transaction(() => {
    const plan = previewGroupRange(id, input);
    const now = new Date().toISOString();
    for (const t of plan.trimmed) {
      db.update(ageGroups).set({ minBirthYear: t.minBirthYear, maxBirthYear: t.maxBirthYear, updatedAt: now }).where(eq(ageGroups.id, t.id)).run();
    }
    const group =
      id === null
        ? db.insert(ageGroups).values(input).returning().get()
        : db.update(ageGroups).set({ ...input, updatedAt: now }).where(eq(ageGroups.id, id)).returning().get();
    if (!group) throw new AgeGroupError("Grup bulunamadı.");

    // Program devri öğrenciler taşınmadan önce: kalan haklar yeni grubun günlerinden sayılır. Bugünden başlar,
    // geçmişe antrenman eklenmez; eski grubun programı aşağıda kaldırılır.
    if (plan.takeoverFrom !== null) {
      const rows = db.select().from(groupSchedules).where(eq(groupSchedules.groupId, plan.takeoverFrom)).all();
      for (const s of rows) {
        db.insert(groupSchedules)
          .values({ groupId: group.id, weekday: s.weekday, startTime: s.startTime, endTime: s.endTime, venueId: s.venueId, validFrom: s.validFrom && s.validFrom > today ? s.validFrom : today, validTo: s.validTo })
          .run();
      }
    }

    const moves = [...plan.merged.flatMap((m) => m.students), ...plan.trimmed.flatMap((t) => t.students), ...plan.adopted];
    for (const s of moves) changeGroupKeepingRights(s.id, group.id, today);

    for (const m of plan.merged) {
      for (const c of db.select({ userId: groupCoaches.userId }).from(groupCoaches).where(eq(groupCoaches.groupId, m.id)).all()) {
        db.insert(groupCoaches).values({ groupId: group.id, userId: c.userId }).onConflictDoNothing().run();
      }
      retireGroup(m.id, group.id, today);
    }
    return { group, plan };
  });
  invalidatePeriodCache();
  invalidateSessionWindow();
  return result;
}

/**
 * Grubu kaldırır. Kayıtlı öğrenciler `moveToId` grubuna hak paketleri korunarak taşınır (verilmezse grupsuz kalır),
 * diğer kayıtların grubu da oraya geçer.
 */
export function deleteAgeGroup(id: number, moveToId: number | null, today: string = todayKey()): void {
  if (moveToId === id) throw new AgeGroupError("Öğrenciler silinen gruba taşınamaz.");
  const db = getDb();
  db.transaction(() => {
    const active = (gid: number) => db.select({ id: ageGroups.id }).from(ageGroups).where(and(eq(ageGroups.id, gid), isNull(ageGroups.archivedAt))).get();
    if (!active(id)) throw new AgeGroupError("Grup bulunamadı.");
    if (moveToId !== null && !active(moveToId)) throw new AgeGroupError("Taşınacak grup bulunamadı.");
    const enrolled = db.select({ id: registrations.id }).from(registrations).where(and(eq(registrations.groupId, id), eq(registrations.status, "enrolled"))).all();
    for (const r of enrolled) changeGroupKeepingRights(r.id, moveToId, today);
    retireGroup(id, moveToId, today);
  });
  invalidatePeriodCache();
  invalidateSessionWindow();
}

/**
 * Kayıtlı öğrencileri taşınmış grubu kaldırır: kalan kayıtlar `moveToId`'ye geçer, program ve gelecekteki
 * (yoklaması alınmamış) antrenmanlar silinir, antrenör bağları kalkar. Geçmiş antrenmanı varsa grup arşive
 * alınır (yoklamalar ve hak hesabının geçmişi kalsın), yoksa tamamen silinir.
 */
function retireGroup(id: number, moveToId: number | null, today: string): void {
  const db = getDb();
  db.update(registrations).set({ groupId: moveToId }).where(eq(registrations.groupId, id)).run();
  for (const s of db.select({ id: groupSchedules.id }).from(groupSchedules).where(eq(groupSchedules.groupId, id)).all()) deleteSchedule(s.id);
  // Kalan gelecek antrenmanlar (ek antrenmanlar dahil): yoklaması alınmamışsa silinir
  const taken = db.selectDistinct({ id: attendance.sessionId }).from(attendance).innerJoin(trainingSessions, eq(attendance.sessionId, trainingSessions.id)).where(eq(trainingSessions.groupId, id)).all().map((r) => r.id);
  db.delete(trainingSessions)
    .where(and(eq(trainingSessions.groupId, id), gte(trainingSessions.date, today), ...(taken.length ? [notInArray(trainingSessions.id, taken)] : [])))
    .run();
  db.delete(groupCoaches).where(eq(groupCoaches.groupId, id)).run();
  const history = db.select({ id: trainingSessions.id }).from(trainingSessions).where(eq(trainingSessions.groupId, id)).limit(1).get();
  if (history) db.update(ageGroups).set({ archivedAt: new Date().toISOString() }).where(eq(ageGroups.id, id)).run();
  else db.delete(ageGroups).where(eq(ageGroups.id, id)).run();
}

/** İşlem geçmişi için kısa özet. */
export function describePlan(group: Pick<AgeGroup, "name" | "minBirthYear" | "maxBirthYear">, plan: RangePlan): string {
  const parts = [`${group.name} (${formatYearRange(group)})`];
  for (const m of plan.merged) parts.push(`${m.name} katıldı (${m.students.length} öğrenci)`);
  for (const t of plan.trimmed) parts.push(`${t.name} ${t.newYears} oldu (${t.students.length} öğrenci geçti)`);
  if (plan.adopted.length) parts.push(`${plan.adopted.length} grupsuz yaştaki öğrenci geçti`);
  return parts.join(" · ");
}
