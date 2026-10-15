import { requireTrainer } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EgitmenDerslerClient } from "./EgitmenDerslerClient";

export default async function EgitmenDerslerPage() {
  const user    = await requireTrainer();
  const trainer = await prisma.trainer.findUnique({ where: { userId: user.sub } });
  if (!trainer) return <div className="p-8 text-muted">Eğitmen kaydı bulunamadı.</div>;

  const classes = await prisma.groupClass.findMany({
    where: { trainerId: trainer.id, status: { not: "CANCELLED" } },
    include: { _count: { select: { bookings: { where: { status: "CONFIRMED" } } } } },
    orderBy: { startAt: "asc" },
  });

  return (
    <EgitmenDerslerClient
      initialClasses={classes.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
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
    />
  );
}
