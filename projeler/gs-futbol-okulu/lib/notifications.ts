import { and, desc, eq, inArray, isNull, or, sql, gte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { notificationReads, notifications, type Notification } from "@/lib/db/schema";
import type { Permission } from "@/lib/auth/permissions";

type Target = { userId: number; permission?: never } | { permission: Permission; userId?: never };

export type NotifyInput = Target & {
  kind: string;
  title: string;
  body?: string | null;
  link?: string | null;
  /** Aynı anahtarla ikinci bildirim oluşturulmaz (günlük işler tekrar çalışsa da). */
  dedupeKey?: string;
};

/** Bildirim oluşturur; hata işlemi durdurmaz. */
export function notify(input: NotifyInput): void {
  try {
    getDb()
      .insert(notifications)
      .values({
        userId: input.userId ?? null,
        permission: input.permission ?? null,
        kind: input.kind,
        title: input.title.slice(0, 200),
        body: input.body?.slice(0, 1000) ?? null,
        link: input.link ?? null,
        dedupeKey: input.dedupeKey ?? null,
      })
      .onConflictDoNothing()
      .run();
  } catch (err) {
    console.error("[notify] yazılamadı:", err instanceof Error ? err.message : err);
  }
}

type Viewer = { id: number; permissions: readonly string[] };

/** Son 60 günün bildirimleri: kişiye özel olanlar + izniyle eriştiği ortak bildirimler. */
function visibleWhere(viewer: Viewer) {
  const since = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const perms = [...viewer.permissions];
  const audience = perms.length
    ? or(eq(notifications.userId, viewer.id), and(isNull(notifications.userId), inArray(notifications.permission, perms)))
    : eq(notifications.userId, viewer.id);
  return and(audience, gte(notifications.createdAt, since));
}

export type NotificationView = Notification & { read: boolean };

export function listNotifications(viewer: Viewer, limit = 50): NotificationView[] {
  const rows = getDb()
    .select({ n: notifications, readAt: notificationReads.readAt })
    .from(notifications)
    .leftJoin(notificationReads, and(eq(notificationReads.notificationId, notifications.id), eq(notificationReads.userId, viewer.id)))
    .where(visibleWhere(viewer))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit)
    .all();
  return rows.map((r) => ({ ...r.n, read: Boolean(r.readAt) }));
}

export function unreadCount(viewer: Viewer): number {
  const row = getDb()
    .select({ value: sql<number>`count(*)` })
    .from(notifications)
    .leftJoin(notificationReads, and(eq(notificationReads.notificationId, notifications.id), eq(notificationReads.userId, viewer.id)))
    .where(and(visibleWhere(viewer), isNull(notificationReads.readAt)))
    .get();
  return row?.value ?? 0;
}

/** Görebildiği bildirimleri okundu yapar (ids verilmezse hepsini). */
export function markRead(viewer: Viewer, ids?: number[]): void {
  const visible = listNotifications(viewer, 500)
    .filter((n) => !n.read && (!ids || ids.includes(n.id)))
    .map((n) => n.id);
  if (visible.length === 0) return;
  const now = new Date().toISOString();
  getDb()
    .insert(notificationReads)
    .values(visible.map((notificationId) => ({ notificationId, userId: viewer.id, readAt: now })))
    .onConflictDoNothing()
    .run();
}
