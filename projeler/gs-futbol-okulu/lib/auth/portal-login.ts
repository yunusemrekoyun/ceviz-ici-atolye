import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { guardianStudents, registrations, users, type User } from "@/lib/db/schema";
import { findUserByIdentifier } from "./users";

/**
 * Antrenör / veli girişinde kimlik: kullanıcı adı, e-posta ya da öğrenci numarası.
 * Öğrenci numarasıyla giren, o öğrenciye bağlı (etkin) veli hesabına girer.
 */
export function findPortalUser(identifier: string): User | null {
  if (/^\d{3,7}$/.test(identifier)) {
    const row = getDb()
      .select({ user: users })
      .from(registrations)
      .innerJoin(guardianStudents, eq(guardianStudents.registrationId, registrations.id))
      .innerJoin(users, eq(guardianStudents.userId, users.id))
      .where(and(eq(registrations.studentNo, Number(identifier)), eq(users.status, "active")))
      .orderBy(asc(users.id))
      .get();
    return row?.user ?? null;
  }
  return findUserByIdentifier(identifier);
}
