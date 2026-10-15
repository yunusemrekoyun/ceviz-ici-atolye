import { and, count, desc, eq, gt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { callbackRequests, type CallbackRequest } from "@/lib/db/schema";

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

export function listCallbackRequests(): CallbackRequest[] {
  return getDb().select().from(callbackRequests).orderBy(desc(callbackRequests.createdAt), desc(callbackRequests.id)).all();
}

export function countNewCallbackRequests(): number {
  return getDb().select({ value: count() }).from(callbackRequests).where(eq(callbackRequests.status, "new")).get()?.value ?? 0;
}

/**
 * Yeni talep oluşturur. Aynı numaradan son 24 saatte açık bir talep varsa yenisi açılmaz (yalnızca ad güncellenir),
 * böylece tekrar tekrar gönderim listeyi kirletmez.
 */
export function createCallbackRequest(fullName: string, phone: string, now: Date = new Date()): void {
  const db = getDb();
  const since = new Date(now.getTime() - DEDUP_WINDOW_MS).toISOString();
  const open = db
    .select({ id: callbackRequests.id })
    .from(callbackRequests)
    .where(and(eq(callbackRequests.phone, phone), eq(callbackRequests.status, "new"), gt(callbackRequests.createdAt, since)))
    .get();
  if (open) {
    db.update(callbackRequests).set({ fullName }).where(eq(callbackRequests.id, open.id)).run();
    return;
  }
  db.insert(callbackRequests).values({ fullName, phone, createdAt: now.toISOString() }).run();
}

export function setCallbackStatus(id: number, status: "new" | "done"): boolean {
  const row = getDb()
    .update(callbackRequests)
    .set({ status, handledAt: status === "done" ? new Date().toISOString() : null })
    .where(eq(callbackRequests.id, id))
    .returning({ id: callbackRequests.id })
    .get();
  return Boolean(row);
}

export function updateCallbackNote(id: number, note: string | null): boolean {
  const row = getDb().update(callbackRequests).set({ note }).where(eq(callbackRequests.id, id)).returning({ id: callbackRequests.id }).get();
  return Boolean(row);
}

export function deleteCallbackRequest(id: number): boolean {
  const row = getDb().delete(callbackRequests).where(eq(callbackRequests.id, id)).returning({ id: callbackRequests.id }).get();
  return Boolean(row);
}
