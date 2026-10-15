import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';
const maintenanceCreateSchema = z.object({
  roomId: z.string().min(1),
  description: z.string().min(1).max(1000).transform((value) => value.trim()),
  priority: z.enum(['normal', 'urgent']).default('normal'),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContextFromRequest(request);
    if (!auth || !['admin', 'personel', 'temizlikci'].includes(auth.user.roleSlug)) {
      return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const reports = await prisma.maintenanceReport.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        room: { select: { id: true, name: true, floor: true } },
        reportedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return NextResponse.json({ ok: true, reports });
  } catch {
    return NextResponse.json({ ok: false, message: 'Raporlar alınamadı.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContextFromRequest(request);
    if (!auth || !['admin', 'personel', 'temizlikci'].includes(auth.user.roleSlug)) {
      return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const parsed = maintenanceCreateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Oda ve açıklama zorunludur.' }, { status: 400 });
    }
    const { roomId, description, priority } = parsed.data;

    const report = await prisma.maintenanceReport.create({
      data: {
        roomId,
        reportedById: auth.user.id,
        description,
        priority,
        status: 'open',
      },
      include: {
        room: { select: { id: true, name: true, floor: true } },
        reportedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await writeAuditLog({
      request,
      auth,
      action: 'maintenance.create',
      entityType: 'maintenance_report',
      entityId: report.id,
      summary: `Bakım bildirimi açıldı: oda ${report.room.name}`,
      after: { roomId, priority, status: report.status },
    });

    return NextResponse.json({ ok: true, report }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Rapor oluşturulamadı.';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
