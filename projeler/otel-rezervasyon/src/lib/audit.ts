import type { NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { AuthContext } from '@/lib/auth/session';

type AuditValue = Prisma.InputJsonValue | undefined;

export async function writeAuditLog({
  request,
  auth,
  action,
  entityType,
  entityId,
  summary,
  before,
  after,
}: {
  request?: NextRequest;
  auth?: AuthContext | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  before?: AuditValue;
  after?: AuditValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: auth?.user.id ?? null,
        actorEmail: auth?.user.email ?? null,
        actorRole: auth?.user.roleSlug ?? null,
        action,
        entityType,
        entityId: entityId ?? null,
        summary,
        before: before ?? undefined,
        after: after ?? undefined,
        ipAddress: request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || request?.headers.get('x-real-ip')
          || null,
        userAgent: request?.headers.get('user-agent') ?? null,
      },
    });
  } catch (error) {
    console.error('Audit log write failed.', error);
  }
}
