import { desc, lt } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { loginEvents, type LoginEvent } from "@/lib/db/schema";
import type { RequestMeta } from "./sessions";

const RETENTION_DAYS = 90;

export type LoginOutcome = "success" | "wrong_password" | "rate_limited";

export function recordLoginEvent(identifier: string, userId: number | null, outcome: LoginOutcome, meta: RequestMeta, now: Date = new Date()): void {
  const db = getDb();
  db.insert(loginEvents)
    .values({
      identifier: identifier.slice(0, 64),
      userId,
      success: outcome === "success",
      reason: outcome === "success" ? null : outcome,
      ip: meta.ip?.slice(0, 64) ?? null,
      userAgent: meta.userAgent?.slice(0, 400) ?? null,
      createdAt: now.toISOString(),
    })
    .run();
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.delete(loginEvents).where(lt(loginEvents.createdAt, cutoff)).run();
}

export function listLoginEvents(limit = 50): LoginEvent[] {
  return getDb().select().from(loginEvents).orderBy(desc(loginEvents.createdAt), desc(loginEvents.id)).limit(limit).all();
}
