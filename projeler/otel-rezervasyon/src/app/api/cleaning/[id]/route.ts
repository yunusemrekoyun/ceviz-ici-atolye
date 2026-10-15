import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma, type PrismaTransactionClient } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

const TASK_INCLUDE = {
  room: { select: { id: true, name: true, floor: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
  reportedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
} as const;

const cleaningUpdateSchema = z.object({
  // Pool workflow actions (any staff, incl. housekeeping)
  action: z.enum(['claim', 'complete', 'release']).optional(),
  // Admin/personel field edits
  status: z.enum(['pending', 'in_progress', 'done']).optional(),
  priority: z.enum(['normal', 'urgent']).optional(),
  notes: z.string().max(1000).nullable().optional(),
  assignedToId: z.string().nullable().optional(),
});

// Restore a room to available once it has no remaining active cleaning tasks.
async function maybeFreeRoom(
  tx: PrismaTransactionClient,
  roomId: string,
  excludeTaskId: string,
) {
  const remaining = await tx.cleaningTask.count({
    where: { roomId, status: { not: 'done' }, id: { not: excludeTaskId } },
  });
  if (remaining > 0) return;
  const room = await tx.room.findUnique({ where: { id: roomId }, select: { status: true } });
  if (room?.status === 'cleaning' || room?.status === 'dirty') {
    await tx.room.update({ where: { id: roomId }, data: { status: 'available' } });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthContextFromRequest(request);
    if (!auth || !['admin', 'personel', 'temizlikci'].includes(auth.user.roleSlug)) {
      return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { id } = await params;
    const parsed = cleaningUpdateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Temizlik görevi bilgileri geçersiz.' }, { status: 400 });
    }
    const body = parsed.data;

    const existing = await prisma.cleaningTask.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, message: 'Görev bulunamadı.' }, { status: 404 });
    }

    // ── Pool workflow: claim / complete / release ────────────────────────────
    if (body.action) {
      const isCleaner = auth.user.roleSlug === 'temizlikci';

      if (body.action === 'claim') {
        if (existing.status === 'done') {
          return NextResponse.json({ ok: false, message: 'Bu görev tamamlanmış.' }, { status: 409 });
        }
        if (existing.assignedToId && existing.assignedToId !== auth.user.id) {
          return NextResponse.json({ ok: false, message: 'Bu görev başka bir görevliye ait.' }, { status: 409 });
        }
        const task = await prisma.$transaction(async tx => {
          const t = await tx.cleaningTask.update({
            where: { id },
            data: { assignedToId: auth.user.id, status: 'in_progress' },
            include: TASK_INCLUDE,
          });
          const room = await tx.room.findUnique({ where: { id: t.roomId }, select: { status: true } });
          if (room?.status === 'dirty') {
            await tx.room.update({ where: { id: t.roomId }, data: { status: 'cleaning' } });
          }
          return t;
        });
        await writeAuditLog({
          request, auth, action: 'cleaning.claim', entityType: 'cleaning_task', entityId: id,
          summary: `Temizlik görevi alındı: oda ${task.room.name}`,
        });
        return NextResponse.json({ ok: true, task });
      }

      if (body.action === 'release') {
        if (isCleaner && existing.assignedToId !== auth.user.id) {
          return NextResponse.json({ ok: false, message: 'Bu görev size ait değil.' }, { status: 403 });
        }
        const task = await prisma.$transaction(async tx => {
          const t = await tx.cleaningTask.update({
            where: { id },
            data: { assignedToId: null, status: 'pending' },
            include: TASK_INCLUDE,
          });
          const room = await tx.room.findUnique({ where: { id: t.roomId }, select: { status: true } });
          if (room?.status === 'cleaning') {
            await tx.room.update({ where: { id: t.roomId }, data: { status: 'dirty' } });
          }
          return t;
        });
        await writeAuditLog({
          request, auth, action: 'cleaning.release', entityType: 'cleaning_task', entityId: id,
          summary: `Temizlik görevi havuza bırakıldı: oda ${task.room.name}`,
        });
        return NextResponse.json({ ok: true, task });
      }

      // complete
      if (isCleaner && existing.assignedToId !== auth.user.id) {
        return NextResponse.json({ ok: false, message: 'Bu görev size ait değil.' }, { status: 403 });
      }
      const task = await prisma.$transaction(async tx => {
        const t = await tx.cleaningTask.update({
          where: { id },
          data: {
            status: 'done',
            completedAt: new Date(),
            // Attribute completion to whoever finished it if it was unassigned.
            ...(existing.assignedToId ? {} : { assignedToId: auth.user.id }),
          },
          include: TASK_INCLUDE,
        });
        await maybeFreeRoom(tx, t.roomId, id);
        return t;
      });
      await writeAuditLog({
        request, auth, action: 'cleaning.done', entityType: 'cleaning_task', entityId: id,
        summary: `Temizlik görevi tamamlandı: oda ${task.room.name}`,
      });
      return NextResponse.json({ ok: true, task });
    }

    // ── Admin/personel field edits (legacy path) ─────────────────────────────
    if (auth.user.roleSlug === 'temizlikci') {
      return NextResponse.json({ ok: false, message: 'Yetkisiz alan.' }, { status: 403 });
    }

    const isDone = body.status === 'done';
    const task = await prisma.$transaction(async tx => {
      const t = await tx.cleaningTask.update({
        where: { id },
        data: {
          ...(body.status       !== undefined && { status:       body.status }),
          ...(body.priority     !== undefined && { priority:     body.priority }),
          ...(body.notes        !== undefined && { notes:        body.notes || null }),
          ...(body.assignedToId !== undefined && { assignedToId: body.assignedToId || null }),
          ...(isDone && { completedAt: new Date() }),
        },
        include: TASK_INCLUDE,
      });
      if (isDone) await maybeFreeRoom(tx, t.roomId, id);
      return t;
    });

    await writeAuditLog({
      request,
      auth,
      action: isDone ? 'cleaning.done' : 'cleaning.update',
      entityType: 'cleaning_task',
      entityId: task.id,
      summary: isDone ? `Temizlik görevi tamamlandı: oda ${task.room.name}` : `Temizlik görevi güncellendi: oda ${task.room.name}`,
      before: { status: existing.status, priority: existing.priority, assignedToId: existing.assignedToId },
      after: { status: task.status, priority: task.priority, assignedToId: task.assignedToId },
    });

    return NextResponse.json({ ok: true, task });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Güncelleme başarısız.';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthContextFromRequest(request);
    if (!auth || !['admin', 'personel'].includes(auth.user.roleSlug)) {
      return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { id } = await params;
    const task = await prisma.cleaningTask.findUnique({ where: { id }, select: { roomId: true } });
    if (!task) return NextResponse.json({ ok: false, message: 'Görev bulunamadı.' }, { status: 404 });

    await prisma.$transaction(async tx => {
      await tx.cleaningTask.delete({ where: { id } });
      await maybeFreeRoom(tx, task.roomId, id);
    });

    await writeAuditLog({
      request, auth, action: 'cleaning.delete', entityType: 'cleaning_task', entityId: id,
      summary: 'Temizlik görevi silindi.', before: { roomId: task.roomId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Silme başarısız.';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
