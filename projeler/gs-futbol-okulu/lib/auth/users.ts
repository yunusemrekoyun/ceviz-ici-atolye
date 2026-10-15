import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { roles, users, type User } from "@/lib/db/schema";
import type { Portal } from "./permissions";
import { getDummyHash, hashPassword, verifyPassword } from "./password";
import { deleteUserSessions } from "./sessions";

export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 128;

/** Giriş kutusuna yazılan değer: boşluklar atılır, küçük harfe çevrilir (kullanıcı adı ve e-posta ASCII). */
export function normalizeIdentifier(raw: string): string {
  return raw.normalize("NFKC").trim().toLowerCase();
}

/** @ içeriyorsa e-postayla, değilse kullanıcı adıyla arar. (Öğrenci numarasıyla veli girişi VEL-01'de eklenecek.) */
export function findUserByIdentifier(identifier: string): User | null {
  const db = getDb();
  const column = identifier.includes("@") ? users.email : users.username;
  return db.select().from(users).where(eq(column, identifier)).get() ?? null;
}

export function validatePassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Şifre ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} karakter olmalı.`);
  }
}

/** Şifreyi değiştirir ve kullanıcının tüm açık oturumlarını kapatır. */
export async function setUserPassword(userId: number, password: string): Promise<void> {
  validatePassword(password);
  const passwordHash = await hashPassword(password);
  getDb().update(users).set({ passwordHash, updatedAt: new Date().toISOString() }).where(eq(users.id, userId)).run();
  deleteUserSessions(userId);
}

/** Admin hesabını oluşturur ya da şifresini günceller (seed script'i). */
export async function upsertAdmin(rawUsername: string, password: string): Promise<{ user: User; created: boolean }> {
  const username = normalizeIdentifier(rawUsername);
  if (!USERNAME_PATTERN.test(username)) {
    throw new Error("Kullanıcı adı 3-32 karakter olmalı; yalnızca küçük harf, rakam, nokta, tire ve alt çizgi içerebilir.");
  }
  validatePassword(password);
  const db = getDb();
  const existing = db.select().from(users).where(and(eq(users.username, username), eq(users.role, "admin"))).get();
  if (existing) {
    await setUserPassword(existing.id, password);
    return { user: existing, created: false };
  }
  if (findUserByIdentifier(username)) throw new Error(`"${username}" kullanıcı adı başka bir hesapta kullanılıyor.`);
  const user = db
    .insert(users)
    .values({ role: "admin", username, passwordHash: await hashPassword(password), status: "active" })
    .returning()
    .get();
  return { user, created: true };
}

export function portalOf(roleKey: string): Portal | null {
  const row = getDb().select({ portal: roles.portal }).from(roles).where(eq(roles.key, roleKey)).get();
  return (row?.portal as Portal | undefined) ?? null;
}

/**
 * Kimlik + şifre doğrular; yalnız izin verilen panellere (portal) ait aktif hesaplar girebilir.
 * Kullanıcı yoksa da şifre özeti hesaplanır (zamanlama farkıyla hesap varlığı sızmasın).
 * `findUser` verilirse kimlik ona göre çözülür (ör. veli için öğrenci numarası).
 */
export async function authenticate(
  rawIdentifier: string,
  password: string,
  portals: readonly Portal[],
  findUser: (identifier: string) => User | null = findUserByIdentifier,
): Promise<User | null> {
  const identifier = normalizeIdentifier(rawIdentifier);
  if (!identifier || !password || password.length > MAX_PASSWORD_LENGTH) return null;
  const user = findUser(identifier);
  const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok || user.status !== "active") return null;
  const portal = portalOf(user.role);
  return portal && portals.includes(portal) ? user : null;
}

export function markLoggedIn(userId: number, now: Date = new Date()): void {
  getDb().update(users).set({ lastLoginAt: now.toISOString() }).where(eq(users.id, userId)).run();
}
