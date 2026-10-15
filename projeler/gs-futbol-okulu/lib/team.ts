import { and, asc, count, eq, inArray, ne } from "drizzle-orm";
import { z } from "zod";
import { UserError } from "@/lib/admin-action";
import { getDb } from "@/lib/db";
import { roles, users, type Role, type User } from "@/lib/db/schema";
import { normalizePhone } from "@/lib/phone";
import { tidyName } from "@/lib/format";
import { hashPassword } from "@/lib/auth/password";
import { PERMISSION_KEYS, type Portal } from "@/lib/auth/permissions";
import { deleteUserSessions } from "@/lib/auth/sessions";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, USERNAME_PATTERN, normalizeIdentifier, setUserPassword } from "@/lib/auth/users";

/** Ekip = yönetim paneli ve antrenör paneli kullanıcıları (veliler ayrı ekranda). */
export function listStaffRoles(): Role[] {
  return getDb().select().from(roles).where(ne(roles.portal, "guardian")).orderBy(asc(roles.portal), asc(roles.name)).all();
}

export function listStaff(): (User & { roleName: string; portal: Portal })[] {
  return getDb()
    .select({ user: users, roleName: roles.name, portal: roles.portal })
    .from(users)
    .innerJoin(roles, eq(roles.key, users.role))
    .where(ne(roles.portal, "guardian"))
    .orderBy(asc(users.fullName))
    .all()
    .map((r) => ({ ...r.user, roleName: r.roleName, portal: r.portal as Portal }));
}

export function roleUserCounts(): Record<string, number> {
  const rows = getDb().select({ role: users.role, n: count() }).from(users).groupBy(users.role).all();
  return Object.fromEntries(rows.map((r) => [r.role, r.n]));
}

const optionalText = (max: number) =>
  z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length <= max, { error: `En fazla ${max} karakter.` })
    .transform((v) => v || null);

export const staffSchema = z.object({
  fullName: z
    .string()
    .transform(tidyName)
    .refine((v) => v.length >= 3 && v.length <= 120, { error: "Ad soyad giriniz." }),
  username: z
    .string()
    .transform(normalizeIdentifier)
    .refine((v) => USERNAME_PATTERN.test(v), { error: "3-32 karakter: küçük harf, rakam, nokta, tire, alt çizgi." }),
  email: optionalText(254)
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => v === null || z.email().safeParse(v).success, { error: "Geçerli bir e-posta giriniz." }),
  phone: z.string().transform((v, ctx) => {
    if (!v.trim()) return null;
    const p = normalizePhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "Geçerli bir cep telefonu giriniz." });
      return z.NEVER;
    }
    return p;
  }),
  role: z.string().min(1, { error: "Rol seçiniz." }),
  password: z
    .string()
    .refine((v) => v === "" || (v.length >= MIN_PASSWORD_LENGTH && v.length <= MAX_PASSWORD_LENGTH), {
      error: `Şifre ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} karakter olmalı.`,
    }),
});
export type StaffInput = z.output<typeof staffSchema>;

function staffRole(key: string): Role {
  const role = getDb().select().from(roles).where(eq(roles.key, key)).get();
  if (!role || role.portal === "guardian") throw new UserError("Geçersiz rol.");
  return role;
}

function assertUnique(input: StaffInput, exceptId?: number): void {
  const db = getDb();
  const same = (col: typeof users.username | typeof users.email, v: string) =>
    db.select({ id: users.id }).from(users).where(exceptId ? and(eq(col, v), ne(users.id, exceptId)) : eq(col, v)).get();
  if (same(users.username, input.username)) throw new UserError("Bu kullanıcı adı kullanılıyor.");
  if (input.email && same(users.email, input.email)) throw new UserError("Bu e-posta başka bir hesapta kayıtlı.");
}

/** Aktif yönetici sayısı: son yönetici pasifleştirilemez / rolü değiştirilemez. */
function activeAdminCount(): number {
  return getDb().select({ n: count() }).from(users).where(and(eq(users.role, "admin"), eq(users.status, "active"))).get()?.n ?? 0;
}

export async function createStaff(input: StaffInput): Promise<User> {
  staffRole(input.role);
  assertUnique(input);
  if (!input.password) throw new UserError("Yeni kullanıcı için ilk şifreyi belirleyin.");
  return getDb()
    .insert(users)
    .values({
      role: input.role,
      username: input.username,
      email: input.email,
      phone: input.phone,
      fullName: input.fullName,
      passwordHash: await hashPassword(input.password),
      status: "active",
    })
    .returning()
    .get();
}

export async function updateStaff(id: number, input: StaffInput, actorId: number): Promise<User> {
  const db = getDb();
  const current = db.select().from(users).where(eq(users.id, id)).get();
  if (!current) throw new UserError("Kullanıcı bulunamadı.");
  staffRole(input.role);
  assertUnique(input, id);
  if (current.role !== input.role) {
    if (id === actorId) throw new UserError("Kendi rolünüzü değiştiremezsiniz.");
    if (current.role === "admin" && current.status === "active" && activeAdminCount() <= 1) throw new UserError("Son yöneticinin rolü değiştirilemez.");
  }
  const user = db
    .update(users)
    .set({ role: input.role, username: input.username, email: input.email, phone: input.phone, fullName: input.fullName, updatedAt: new Date().toISOString() })
    .where(eq(users.id, id))
    .returning()
    .get();
  if (input.password) await setUserPassword(id, input.password);
  else if (current.role !== input.role) deleteUserSessions(id); // yeni izinlerle yeniden giriş
  return user;
}

export function setStaffStatus(id: number, active: boolean, actorId: number): User {
  const db = getDb();
  const current = db.select().from(users).where(eq(users.id, id)).get();
  if (!current) throw new UserError("Kullanıcı bulunamadı.");
  if (!active && id === actorId) throw new UserError("Kendi hesabınızı pasifleştiremezsiniz.");
  if (!active && current.role === "admin" && activeAdminCount() <= 1) throw new UserError("Son aktif yönetici pasifleştirilemez.");
  const user = db.update(users).set({ status: active ? "active" : "disabled", updatedAt: new Date().toISOString() }).where(eq(users.id, id)).returning().get();
  if (!active) deleteUserSessions(id);
  return user;
}

/* ---------------- Roller ---------------- */

export const roleSchema = z.object({
  name: z
    .string()
    .transform(tidyName)
    .refine((v) => v.length >= 2 && v.length <= 60, { error: "Rol adı giriniz." }),
  portal: z.enum(["admin", "coach"], { error: "Panel seçiniz." }),
  permissions: z.array(z.string()).transform((list) => [...new Set(list.filter((k) => PERMISSION_KEYS.has(k)))]),
});
export type RoleInput = z.output<typeof roleSchema>;

function slug(name: string): string {
  const base = name
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c] ?? c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || "rol";
}

export function saveRole(key: string | null, input: RoleInput): Role {
  const db = getDb();
  if (key) {
    const current = db.select().from(roles).where(eq(roles.key, key)).get();
    if (!current || current.portal === "guardian") throw new UserError("Rol bulunamadı.");
    if (current.key === "admin") throw new UserError("Yönetici rolü her zaman tüm izinlere sahiptir, düzenlenemez.");
    const portal = current.isSystem ? current.portal : input.portal;
    return db.update(roles).set({ name: input.name, portal, permissions: JSON.stringify(input.permissions) }).where(eq(roles.key, key)).returning().get();
  }
  let newKey = slug(input.name);
  for (let i = 2; db.select({ k: roles.key }).from(roles).where(eq(roles.key, newKey)).get(); i++) newKey = `${slug(input.name)}-${i}`;
  return db.insert(roles).values({ key: newKey, name: input.name, portal: input.portal, permissions: JSON.stringify(input.permissions) }).returning().get();
}

export function deleteRole(key: string): void {
  const db = getDb();
  const role = db.select().from(roles).where(eq(roles.key, key)).get();
  if (!role) throw new UserError("Rol bulunamadı.");
  if (role.isSystem) throw new UserError("Sistem rolleri silinemez.");
  const used = db.select({ n: count() }).from(users).where(inArray(users.role, [key])).get()?.n ?? 0;
  if (used > 0) throw new UserError(`Bu rolde ${used} kullanıcı var; önce onları başka role taşıyın.`);
  db.delete(roles).where(eq(roles.key, key)).run();
}
