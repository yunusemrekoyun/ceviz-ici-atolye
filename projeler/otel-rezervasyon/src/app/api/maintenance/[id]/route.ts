import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';
const maintenanceUpdateSchema = z.object({
  status: z.enum(['open', 'resolved']).optional(),
  priority: z.enum(['normal', 'urgent']).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthContextFromRequest(request);
    if (!auth || !['admin', 'personel'].includes(auth.user.roleSlug)) {
      return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { id } = await params;
    const parsed = maintenanceUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Bakım bilgileri geçersiz.' }, { status: 400 });
    }
    const body = parsed.data;
    const before = await prisma.maintenanceReport.findUnique({
      where: { id },
      select: { id: true, status: true, priority: true },
    });

    const report = await prisma.maintenanceReport.update({
      where: { id },
      data: {
        ...(body.status   !== undefined && { status:   body.status }),
        ...(body.priority !== undefined && { priority: body.priority }),
      },
      include: {
        room: { select: { id: true, name: true, floor: true } },
        reportedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await writeAuditLog({
      request,
      auth,
      action: body.status === 'resolved' ? 'maintenance.resolve' : 'maintenance.update',
      entityType: 'maintenance_report',
      entityId: report.id,
      summary: body.status === 'resolved'
        ? `Bakım bildirimi çözüldü: oda ${report.room.name}`
        : `Bakım bildirimi güncellendi: oda ${report.room.name}`,
      before: before ?? undefined,
      after: { status: report.status, priority: report.priority },
    });

    return NextResponse.json({ ok: true, report });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Güncelleme başarısız.';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
