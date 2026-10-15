import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth || auth.user.roleSlug !== 'admin') {
    return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action')?.trim();
  const entityType = searchParams.get('entityType')?.trim();
  const actor = searchParams.get('actor')?.trim();
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const take = Math.min(Number.parseInt(searchParams.get('take') ?? '80', 10) || 80, 200);

  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}),
    ...(entityType ? { entityType } : {}),
    ...(actor ? { actorEmail: { contains: actor, mode: 'insensitive' } } : {}),
    ...((from || to) ? {
      createdAt: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      },
    } : {}),
  };

  try {
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });

    return NextResponse.json({ ok: true, logs });
  } catch (error) {
    console.error('Audit logs fetch failed.', error);
    return NextResponse.json({ ok: false, message: 'Loglar alınamadı.' }, { status: 503 });
  }
}
