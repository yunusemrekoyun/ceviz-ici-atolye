import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { guardianStudents, registrations, users } from "@/lib/db/schema";
import { notify } from "@/lib/notifications";

type Message = { kind: string; title: string; body?: string; link?: string; dedupeKey?: string };

/** Gruplardaki kayıtlı öğrencilerin veli hesaplarına panel bildirimi (her veli bir kez). */
export function notifyGuardiansOfGroups(groupIds: number[] | null, message: Message): number {
  const db = getDb();
  const conds = [eq(registrations.status, "enrolled"), eq(users.status, "active")];
  if (groupIds) {
    if (groupIds.length === 0) return 0;
    conds.push(inArray(registrations.groupId, groupIds));
  }
  const rows = db
    .selectDistinct({ userId: guardianStudents.userId })
    .from(guardianStudents)
    .innerJoin(registrations, eq(guardianStudents.registrationId, registrations.id))
    .innerJoin(users, eq(guardianStudents.userId, users.id))
    .where(and(...conds))
    .all();
  for (const r of rows) notify({ userId: r.userId, ...message, dedupeKey: message.dedupeKey ? `${message.dedupeKey}:${r.userId}` : undefined });
  return rows.length;
}

/** Tek öğrencinin velilerine bildirim. */
export function notifyGuardiansOfStudent(registrationId: number, message: Message): number {
  const rows = getDb()
    .select({ userId: guardianStudents.userId })
    .from(guardianStudents)
    .innerJoin(users, eq(guardianStudents.userId, users.id))
    .where(and(eq(guardianStudents.registrationId, registrationId), eq(users.status, "active")))
    .all();
  for (const r of rows) notify({ userId: r.userId, ...message, dedupeKey: message.dedupeKey ? `${message.dedupeKey}:${r.userId}` : undefined });
  return rows.length;
}
