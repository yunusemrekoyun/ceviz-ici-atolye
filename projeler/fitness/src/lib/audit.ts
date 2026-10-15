import { prisma } from "./prisma";

export interface AuditOptions {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
}

export async function audit(opts: AuditOptions) {
  try {
    await prisma.auditLog.create({ data: opts as any });
  } catch (e) {
    // Audit log hatası ana işlemi durdurmamalı
    console.error("[Audit]", e);
  }
}
