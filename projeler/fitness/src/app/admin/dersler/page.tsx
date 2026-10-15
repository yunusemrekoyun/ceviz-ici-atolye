import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClassesClient } from "@/components/admin/ClassesClient";

export default async function DerslerPage() {
  await requireAdmin();

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 13); // 2 hafta

  const [classes, trainers, branches] = await Promise.all([
    prisma.groupClass.findMany({
      where: { startAt: { gte: weekStart, lte: weekEnd } },
      include: {
        trainer: { include: { user: { select: { name: true } } } },
        _count: { select: { bookings: { where: { status: "CONFIRMED" } } } },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.trainer.findMany({
      where: { isActive: true },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <ClassesClient
      initialClasses={classes.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        trainerId: c.trainerId,
        trainerName: c.trainer?.user.name ?? null,
        branchId: c.branchId,
        location: c.location ?? null,
        capacity: c.capacity,
        durationMin: c.durationMin,
        color: c.color,
        startAt: c.startAt.toISOString(),
        endAt: c.endAt.toISOString(),
        status: c.status,
        isPublished: c.isPublished,
        confirmedCount: c._count.bookings,
      }))}
      trainers={trainers.map((t) => ({ id: t.id, name: t.user.name ?? "—" }))}
      branches={branches.map((b) => ({ id: b.id, name: b.name }))}
    />
  );
}
