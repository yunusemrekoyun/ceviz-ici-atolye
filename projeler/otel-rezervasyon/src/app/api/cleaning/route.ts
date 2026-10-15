import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

const STAFF_ROLES = ['admin', 'personel', 'temizlikci'];

const TASK_INCLUDE = {
  room: { select: { id: true, name: true, floor: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
  reportedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
} as const;

const cleaningCreateSchema = z.object({
  roomId: z.string().min(1),
  priority: z.enum(['normal', 'urgent']).default('normal'),
  notes: z.string().max(1000).nullable().optional(),
  // Accepted for backward compatibility but ignored — tasks go to the shared pool.
  assignedToId: z.string().nullable().optional(),
});

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthContextFromRequest(request);
    if (!auth || !STAFF_ROLES.includes(auth.user.roleSlug)) {
      return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const isCleaner = auth.user.roleSlug === 'temizlikci';
    const today = startOfToday();

    const [pool, mine, completedToday, doneAll, doneToday, rooms, tasks] = await Promise.all([
      // Shared pool — unclaimed, waiting
      prisma.cleaningTask.findMany({
        where: { status: 'pending', assignedToId: null },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        include: TASK_INCLUDE,
      }),
      // My active work (claimed, in progress)
      prisma.cleaningTask.findMany({
        where: { assignedToId: auth.user.id, status: { not: 'done' } },
        orderBy: [{ createdAt: 'asc' }],
        include: TASK_INCLUDE,
      }),
      // Completed today (all cleaners — transparency)
      prisma.cleaningTask.findMany({
        where: { status: 'done', completedAt: { gte: today } },
        orderBy: [{ completedAt: 'desc' }],
        include: TASK_INCLUDE,
      }),
      prisma.cleaningTask.groupBy({
        by: ['assignedToId'],
        where: { status: 'done', assignedToId: { not: null } },
        _count: { _all: true },
      }),
      prisma.cleaningTask.groupBy({
        by: ['assignedToId'],
        where: { status: 'done', completedAt: { gte: today }, assignedToId: { not: null } },
        _count: { _all: true },
      }),
      prisma.room.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, floor: true, status: true },
      }),
      // Admin/personel see the full active board; cleaners rely on pool/mine.
      isCleaner
        ? Promise.resolve([])
        : prisma.cleaningTask.findMany({
            where: {},
            orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
            take: 200,
            include: TASK_INCLUDE,
          }),
    ]);

    // ── Per-cleaner leaderboard ──────────────────────────────────────────────
    const cleanerIds = Array.from(new Set([
      ...doneAll.map(d => d.assignedToId).filter(Boolean) as string[],
    ]));
    const cleaners = cleanerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: cleanerIds } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : [];
    const todayMap = new Map(doneToday.map(d => [d.assignedToId, d._count._all]));
    const stats = cleaners
      .map(c => ({
        id: c.id,
        name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email,
        total: doneAll.find(d => d.assignedToId === c.id)?._count._all ?? 0,
        today: todayMap.get(c.id) ?? 0,
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({ ok: true, pool, mine, completedToday, rooms, stats, tasks });
  } catch {
    return NextResponse.json({ ok: false, message: 'Görevler alınamadı.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContextFromRequest(request);
    if (!auth || !['admin', 'personel'].includes(auth.user.roleSlug)) {
      return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const parsed = cleaningCreateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Temizlik görevi bilgileri geçersiz.' }, { status: 400 });
    }
    const { roomId, priority, notes } = parsed.data;

    const { task, created } = await prisma.$transaction(async tx => {
      const room = await tx.room.findUnique({ where: { id: roomId }, select: { status: true } });
      if (!room) throw new Error('ROOM_NOT_FOUND');
      if (room.status === 'occupied' || room.status === 'maintenance') {
        throw new Error('ROOM_BUSY');
      }

      // Idempotent: if the room already has an active task, reuse it.
      const active = await tx.cleaningTask.findFirst({
        where: { roomId, status: { not: 'done' } },
        include: TASK_INCLUDE,
      });
      if (active) {
        if (room.status === 'available') {
          await tx.room.update({ where: { id: roomId }, data: { status: 'dirty' } });
        }
        return { task: active, created: false };
      }

      // Room enters the "dirty" (queued for cleaning) state; the task waits in pool.
      if (room.status !== 'cleaning') {
        await tx.room.update({ where: { id: roomId }, data: { status: 'dirty' } });
      }

      const t = await tx.cleaningTask.create({
        data: {
          roomId,
          reportedById: auth.user.id,
          assignedToId: null,
          priority,
          notes: notes || null,
          status: 'pending',
        },
        include: TASK_INCLUDE,
      });
      return { task: t, created: true };
    });

    if (created) {
      await writeAuditLog({
        request,
        auth,
        action: 'cleaning.create',
        entityType: 'cleaning_task',
        entityId: task.id,
        summary: `Oda temizliğe gönderildi: ${task.room.name}`,
        after: { roomId, priority, status: task.status },
      });
    }

    return NextResponse.json({ ok: true, task }, { status: created ? 201 : 200 });
  } catch (err) {
    if (err instanceof Error && err.message === 'ROOM_BUSY') {
      return NextResponse.json(
        { ok: false, message: 'Dolu veya bakımdaki oda temizliğe gönderilemez.' },
        { status: 409 },
      );
    }
    if (err instanceof Error && err.message === 'ROOM_NOT_FOUND') {
      return NextResponse.json({ ok: false, message: 'Oda bulunamadı.' }, { status: 404 });
    }
    const msg = err instanceof Error ? err.message : 'Görev oluşturulamadı.';
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
