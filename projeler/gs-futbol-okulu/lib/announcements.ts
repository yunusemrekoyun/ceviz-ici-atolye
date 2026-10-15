import { desc, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { ageGroups, announcements, type Announcement } from "@/lib/db/schema";

export type AnnouncementView = Announcement & { groups: number[]; groupNames: string[] };

function parseGroups(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x)) : [];
  } catch {
    return [];
  }
}

export function createAnnouncement(input: { title: string; body: string; groupIds: number[]; kind?: "general" | "cancel"; sessionId?: number | null; userId: number | null }): Announcement {
  return getDb()
    .insert(announcements)
    .values({
      title: input.title,
      body: input.body,
      groupIds: input.groupIds.length ? JSON.stringify([...new Set(input.groupIds)]) : null,
      kind: input.kind ?? "general",
      sessionId: input.sessionId ?? null,
      createdBy: input.userId,
    })
    .returning()
    .get();
}

export function deleteAnnouncement(id: number): void {
  getDb().delete(announcements).where(inArray(announcements.id, [id])).run();
}

/** Duyurular; groupIds verilirse yalnız herkese açık olanlar ve bu gruplara gidenler. */
export function listAnnouncements(options: { groupIds?: number[] | null; limit?: number } = {}): AnnouncementView[] {
  const names = new Map(getDb().select({ id: ageGroups.id, name: ageGroups.name }).from(ageGroups).all().map((g) => [g.id, g.name]));
  return getDb()
    .select()
    .from(announcements)
    .orderBy(desc(announcements.createdAt), desc(announcements.id))
    .limit(options.limit ?? 50)
    .all()
    .map((a) => {
      const groups = parseGroups(a.groupIds);
      return { ...a, groups, groupNames: groups.map((g) => names.get(g) ?? `#${g}`) };
    })
    .filter((a) => !options.groupIds || a.groups.length === 0 || a.groups.some((g) => options.groupIds!.includes(g)));
}
