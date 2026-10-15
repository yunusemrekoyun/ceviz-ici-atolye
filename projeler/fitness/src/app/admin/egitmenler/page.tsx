import { prisma } from "@/lib/prisma";
import { TrainersClient } from "@/components/admin/TrainersClient";

export default async function TrainersPage() {
  const trainers = await prisma.trainer.findMany({
    include: {
      user: { select: { name: true, email: true, avatarUrl: true } },
      _count: { select: { members: true, appointments: true } },
      availabilities: { orderBy: { dayOfWeek: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return <TrainersClient initialTrainers={JSON.parse(JSON.stringify(trainers))} />;
}
