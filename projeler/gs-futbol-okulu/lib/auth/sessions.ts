import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, lt, ne, or } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { roles, sessions, users, type Session } from "@/lib/db/schema";
import { ALL_PERMISSIONS, parsePermissions, type Permission, type Portal } from "./permissions";
import { SESSION_IDLE_SECONDS, SESSION_MAX_AGE_SECONDS } from "./cookie";

/** lastSeenAt en fazla bu sıklıkta güncellenir; her istekte DB'ye yazmamak için. */
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

/** Oturum sahibi: rolü, girdiği panel (portal) ve izinleri. */
export type SessionUser = {
  id: number;
  role: string;
  portal: Portal;
  permissions: Permission[];
  username: string | null;
  fullName: string | null;
  sessionId: string;
};

/** Sistem yönetici rolü her zaman tüm izinlere sahiptir (yanlış düzenlemeyle kimse kilitlenmesin). */
export function resolvePermissions(roleKey: string, raw: string | null): Permission[] {
  return roleKey === "admin" ? ALL_PERMISSIONS : parsePermissions(raw);
}

/** İstek bilgisi: güvenlik kaydı için IP ve tarayıcı. */
export type RequestMeta = { ip?: string | null; userAgent?: string | null };

const clip = (value: string | null | undefined, max: number) => (value ? value.slice(0, max) : null);

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Yeni oturum açar ve çereze yazılacak ham token'ı döner. DB'de yalnızca özeti tutulur. */
export function createSession(userId: number, now: Date = new Date(), meta: RequestMeta = {}): string {
  const token = randomBytes(32).toString("base64url");
  const nowIso = now.toISOString();
  getDb()
    .insert(sessions)
    .values({
      id: hashToken(token),
      userId,
      expiresAt: new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000).toISOString(),
      lastSeenAt: nowIso,
      ip: clip(meta.ip, 64),
      lastIp: clip(meta.ip, 64),
      userAgent: clip(meta.userAgent, 400),
      createdAt: nowIso,
    })
    .run();
  return token;
}

/** Geçerli bir oturumun sahibini döner; süresi dolmuş/hareketsiz oturumları siler. */
export function validateSessionToken(token: string | undefined, now: Date = new Date(), meta: RequestMeta = {}): SessionUser | null {
  if (!token || token.length > 128) return null;
  const db = getDb();
  const id = hashToken(token);
  const row = db
    .select({
      userId: users.id,
      role: users.role,
      portal: roles.portal,
      permissions: roles.permissions,
      username: users.username,
      fullName: users.fullName,
      status: users.status,
      expiresAt: sessions.expiresAt,
      lastSeenAt: sessions.lastSeenAt,
      lastIp: sessions.lastIp,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(roles, eq(roles.key, users.role))
    .where(eq(sessions.id, id))
    .get();
  if (!row) return null;

  const nowMs = now.getTime();
  const lastSeenMs = Date.parse(row.lastSeenAt);
  // Pasifleştirilen hesabın oturumu da burada düşer.
  if (!row.portal || row.status !== "active" || Date.parse(row.expiresAt) <= nowMs || lastSeenMs + SESSION_IDLE_SECONDS * 1000 <= nowMs) {
    db.delete(sessions).where(eq(sessions.id, id)).run();
    return null;
  }
  // Son görülme en fazla 5 dakikada bir yazılır; IP değiştiyse (ör. mobil ağ → Wi-Fi) hemen kaydedilir.
  const ip = clip(meta.ip, 64);
  const ipChanged = Boolean(ip && ip !== row.lastIp);
  if (nowMs - lastSeenMs > TOUCH_INTERVAL_MS || ipChanged) {
    db.update(sessions)
      .set({ lastSeenAt: now.toISOString(), ...(ipChanged ? { lastIp: ip } : {}) })
      .where(eq(sessions.id, id))
      .run();
  }
  return {
    id: row.userId,
    role: row.role,
    portal: row.portal as Portal,
    permissions: resolvePermissions(row.role, row.permissions),
    username: row.username,
    fullName: row.fullName,
    sessionId: id,
  };
}

export function deleteSession(token: string | undefined): void {
  if (!token) return;
  getDb().delete(sessions).where(eq(sessions.id, hashToken(token))).run();
}

export function deleteUserSessions(userId: number): void {
  getDb().delete(sessions).where(eq(sessions.userId, userId)).run();
}

export function purgeExpiredSessions(now: Date = new Date()): void {
  const idleCutoff = new Date(now.getTime() - SESSION_IDLE_SECONDS * 1000).toISOString();
  getDb()
    .delete(sessions)
    .where(or(lt(sessions.expiresAt, now.toISOString()), lt(sessions.lastSeenAt, idleCutoff)))
    .run();
}

export function listUserSessions(userId: number): Session[] {
  return getDb().select().from(sessions).where(eq(sessions.userId, userId)).orderBy(desc(sessions.lastSeenAt)).all();
}

/** Belirli bir oturumu kapatır (yalnızca aynı kullanıcıya aitse). */
export function deleteUserSession(userId: number, sessionId: string): boolean {
  const row = getDb()
    .delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .returning({ id: sessions.id })
    .get();
  return Boolean(row);
}

/** Bu cihaz dışındaki tüm oturumları kapatır; kapatılan sayısını döner. */
export function deleteOtherSessions(userId: number, keepSessionId: string): number {
  return getDb()
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), ne(sessions.id, keepSessionId)))
    .returning({ id: sessions.id })
    .all().length;
}
