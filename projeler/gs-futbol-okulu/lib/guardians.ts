import crypto from "node:crypto";
import { and, asc, eq, gt, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { authTokens, guardianStudents, registrations, users, type Registration, type User } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { deleteUserSessions } from "@/lib/auth/sessions";
import { resolveContactParent } from "@/lib/format";
import { normalizePhone } from "@/lib/phone";

export class GuardianError extends Error {}

export const GUARDIAN_ROLE = "guardian";
/** Veliler için şifre kuralı: en az 8 karakter (her yaşa uygun, ama tahmin edilemez). */
export const GUARDIAN_MIN_PASSWORD = 8;

/** Veli bu öğrencinin velisi mi (hesap–öğrenci bağı). */
export function guardianCanSee(userId: number, registrationId: number): boolean {
  return Boolean(
    getDb()
      .select({ r: guardianStudents.registrationId })
      .from(guardianStudents)
      .where(and(eq(guardianStudents.userId, userId), eq(guardianStudents.registrationId, registrationId)))
      .get(),
  );
}

/** Velinin kayıtlı çocukları (ayrılanlar hariç). */
export function guardianChildren(userId: number): Registration[] {
  return getDb()
    .select({ r: registrations })
    .from(guardianStudents)
    .innerJoin(registrations, eq(guardianStudents.registrationId, registrations.id))
    .where(and(eq(guardianStudents.userId, userId), eq(registrations.status, "enrolled")))
    .orderBy(asc(registrations.studentFullName))
    .all()
    .map((x) => x.r);
}

export function guardiansOfStudent(registrationId: number): User[] {
  return getDb()
    .select({ u: users })
    .from(guardianStudents)
    .innerJoin(users, eq(guardianStudents.userId, users.id))
    .where(eq(guardianStudents.registrationId, registrationId))
    .all()
    .map((x) => x.u);
}

function cleanEmail(raw: string | null | undefined): string | null {
  const v = raw?.trim().toLowerCase();
  return v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
}

/**
 * Öğrencinin veli hesabını bulur ya da oluşturur. Bilgiler kayıttaki iletişim velisinden gelir;
 * aynı telefon ya da e-postaya sahip hesap varsa (kardeş) ona bağlanır.
 */
export function ensureGuardianForStudent(registrationId: number): { user: User; created: boolean } {
  const db = getDb();
  return db.transaction(() => {
    const reg = db.select().from(registrations).where(eq(registrations.id, registrationId)).get();
    if (!reg) throw new GuardianError("Kayıt bulunamadı.");
    if (reg.status !== "enrolled") throw new GuardianError("Veli hesabı yalnız kayıtlı öğrenci için açılır.");
    const linked = guardiansOfStudent(reg.id)[0];
    if (linked) return { user: linked, created: false };
    const contact = resolveContactParent(reg);
    const phone = contact.phone ? normalizePhone(contact.phone) : null;
    const email = cleanEmail(reg.email);
    let user =
      (phone ? db.select().from(users).where(and(eq(users.role, GUARDIAN_ROLE), eq(users.phone, phone))).get() : undefined) ??
      (email ? db.select().from(users).where(and(eq(users.role, GUARDIAN_ROLE), eq(users.email, email))).get() : undefined);
    let created = false;
    if (!user) {
      const emailFree = email && !db.select({ id: users.id }).from(users).where(eq(users.email, email)).get();
      user = db
        .insert(users)
        .values({ role: GUARDIAN_ROLE, fullName: contact.fullName || `${reg.studentFullName} velisi`, phone, email: emailFree ? email : null, status: "invited" })
        .returning()
        .get();
      created = true;
    }
    db.insert(guardianStudents).values({ userId: user.id, registrationId: reg.id, relation: contact.typeLabel }).onConflictDoNothing().run();
    return { user, created };
  });
}

export function unlinkGuardian(userId: number, registrationId: number): void {
  getDb()
    .delete(guardianStudents)
    .where(and(eq(guardianStudents.userId, userId), eq(guardianStudents.registrationId, registrationId)))
    .run();
}

export function setGuardianStatus(userId: number, active: boolean): void {
  const u = getDb().select().from(users).where(and(eq(users.id, userId), eq(users.role, GUARDIAN_ROLE))).get();
  if (!u) throw new GuardianError("Veli hesabı bulunamadı.");
  const status = active ? (u.passwordHash ? "active" : "invited") : "disabled";
  getDb().update(users).set({ status, updatedAt: new Date().toISOString() }).where(eq(users.id, userId)).run();
  if (!active) deleteUserSessions(userId);
}

export function updateGuardianEmail(userId: number, email: string | null): void {
  const clean = email ? cleanEmail(email) : null;
  if (email && !clean) throw new GuardianError("Geçerli bir e-posta yazın.");
  if (clean) {
    const other = getDb().select({ id: users.id }).from(users).where(eq(users.email, clean)).get();
    if (other && other.id !== userId) throw new GuardianError("Bu e-posta başka bir hesapta kayıtlı.");
  }
  getDb().update(users).set({ email: clean, updatedAt: new Date().toISOString() }).where(eq(users.id, userId)).run();
}

/* ---------------- Tek kullanımlık bağlantılar ---------------- */

const TTL_MS = { invite: 7 * 86_400_000, reset: 60 * 60_000 } as const;
export type TokenPurpose = keyof typeof TTL_MS;

const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

/** Yeni bağlantı üretir; aynı amaçlı eski kullanılmamış bağlantılar geçersiz olur. Ham değer yalnız bir kez döner. */
export function createAuthToken(userId: number, purpose: TokenPurpose, createdBy: number | null, now: Date = new Date()): string {
  const raw = crypto.randomBytes(24).toString("base64url");
  const db = getDb();
  db.transaction(() => {
    db.update(authTokens)
      .set({ usedAt: now.toISOString() })
      .where(and(eq(authTokens.userId, userId), eq(authTokens.purpose, purpose), isNull(authTokens.usedAt)))
      .run();
    db.insert(authTokens)
      .values({ userId, purpose, tokenHash: sha(raw), expiresAt: new Date(now.getTime() + TTL_MS[purpose]).toISOString(), createdBy })
      .run();
  });
  return raw;
}

/** Bağlantı geçerliyse sahibini döndürür (tüketmez). */
export function peekAuthToken(raw: string, now: Date = new Date()): { user: User; purpose: TokenPurpose; tokenId: number } | null {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(raw)) return null;
  const row = getDb()
    .select({ t: authTokens, u: users })
    .from(authTokens)
    .innerJoin(users, eq(authTokens.userId, users.id))
    .where(and(eq(authTokens.tokenHash, sha(raw)), isNull(authTokens.usedAt), gt(authTokens.expiresAt, now.toISOString())))
    .get();
  if (!row || row.u.status === "disabled") return null;
  return { user: row.u, purpose: row.t.purpose as TokenPurpose, tokenId: row.t.id };
}

/** Bağlantıyla şifre belirler: bağlantı kullanılmış sayılır, hesap etkinleşir, eski oturumlar kapanır. */
export async function redeemAuthToken(raw: string, password: string, now: Date = new Date()): Promise<User> {
  const found = peekAuthToken(raw, now);
  if (!found) throw new GuardianError("Bağlantının süresi dolmuş ya da daha önce kullanılmış. Okuldan yeni bağlantı isteyin.");
  const min = found.user.role === GUARDIAN_ROLE ? GUARDIAN_MIN_PASSWORD : 10;
  if (password.length < min || password.length > 128) throw new GuardianError(`Şifre en az ${min} karakter olmalı.`);
  const passwordHash = await hashPassword(password);
  const db = getDb();
  db.transaction(() => {
    const used = db
      .update(authTokens)
      .set({ usedAt: now.toISOString() })
      .where(and(eq(authTokens.id, found.tokenId), isNull(authTokens.usedAt)))
      .returning({ id: authTokens.id })
      .get();
    if (!used) throw new GuardianError("Bağlantı daha önce kullanılmış.");
    db.update(users).set({ passwordHash, status: "active", updatedAt: now.toISOString() }).where(eq(users.id, found.user.id)).run();
  });
  deleteUserSessions(found.user.id);
  return found.user;
}

/* ---------------- Yönetim listesi ---------------- */

export type GuardianRow = {
  registrationId: number;
  studentName: string;
  studentNo: number | null;
  groupId: number | null;
  contactName: string;
  contactPhone: string;
  guardian: { id: number; name: string | null; email: string | null; phone: string | null; status: string; lastLoginAt: string | null; children: number } | null;
};

export function guardianOverview(): GuardianRow[] {
  const db = getDb();
  const regs = db.select().from(registrations).where(eq(registrations.status, "enrolled")).orderBy(asc(registrations.studentFullName)).all();
  const links = regs.length ? db.select().from(guardianStudents).where(inArray(guardianStudents.registrationId, regs.map((r) => r.id))).all() : [];
  const userIds = [...new Set(links.map((l) => l.userId))];
  const us = userIds.length ? db.select().from(users).where(inArray(users.id, userIds)).all() : [];
  const childCount = new Map<number, number>();
  for (const l of links) childCount.set(l.userId, (childCount.get(l.userId) ?? 0) + 1);
  return regs.map((r) => {
    const link = links.find((l) => l.registrationId === r.id);
    const u = link ? us.find((x) => x.id === link.userId) : undefined;
    const contact = resolveContactParent(r);
    return {
      registrationId: r.id,
      studentName: r.studentFullName,
      studentNo: r.studentNo,
      groupId: r.groupId,
      contactName: contact.fullName,
      contactPhone: contact.phone,
      guardian: u ? { id: u.id, name: u.fullName, email: u.email, phone: u.phone, status: u.status, lastLoginAt: u.lastLoginAt, children: childCount.get(u.id) ?? 1 } : null,
    };
  });
}
