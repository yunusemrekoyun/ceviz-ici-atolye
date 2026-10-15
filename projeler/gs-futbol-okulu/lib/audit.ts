import { desc, eq, and, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { auditLog, type AuditEntry } from "@/lib/db/schema";

export type Actor = { id: number; fullName: string | null; username: string | null; ip?: string | null };

export type AuditInput = {
  action: string;
  summary: string;
  entity?: string;
  entityId?: string | number;
  data?: unknown;
};

/** İşlem geçmişine yazar. Kayıt yazılamazsa işlemi durdurmaz (yalnız loglanır). */
export function writeAudit(actor: Actor | null, input: AuditInput): void {
  try {
    getDb()
      .insert(auditLog)
      .values({
        userId: actor?.id ?? null,
        userName: actor ? (actor.fullName ?? actor.username ?? `#${actor.id}`) : "sistem",
        action: input.action,
        entity: input.entity ?? null,
        entityId: input.entityId != null ? String(input.entityId) : null,
        summary: input.summary.slice(0, 500),
        data: input.data === undefined ? null : JSON.stringify(input.data).slice(0, 4000),
        ip: actor?.ip ?? null,
      })
      .run();
  } catch (err) {
    console.error("[audit] yazılamadı:", err instanceof Error ? err.message : err);
  }
}

export function listAudit(options: { limit?: number; entity?: string; entityId?: string | number } = {}): AuditEntry[] {
  const db = getDb();
  const where =
    options.entity && options.entityId != null
      ? and(eq(auditLog.entity, options.entity), eq(auditLog.entityId, String(options.entityId)))
      : options.entity
        ? eq(auditLog.entity, options.entity)
        : undefined;
  const q = db.select().from(auditLog);
  return (where ? q.where(where) : q).orderBy(desc(auditLog.createdAt), desc(auditLog.id)).limit(options.limit ?? 100).all();
}

/** Bir kaydın belirli işleminin en son yazılan kaydı (ör. okula kaydı kim yaptı). */
export function lastAuditOf(entity: string, entityId: string | number, actions: string[]): AuditEntry | null {
  return (
    getDb()
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entity, entity), eq(auditLog.entityId, String(entityId)), inArray(auditLog.action, actions)))
      .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
      .limit(1)
      .get() ?? null
  );
}
