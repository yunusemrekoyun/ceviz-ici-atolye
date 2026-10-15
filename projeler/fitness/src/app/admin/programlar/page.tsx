import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProgramBuilderClient } from "@/components/admin/ProgramBuilderClient";

export default async function ProgramlarPage() {
  await requireAdmin();

  const [programs, members, trainers] = await Promise.all([
    prisma.workoutProgram.findMany({
      include: {
        member: { include: { user: { select: { name: true } } } },
        trainer: { include: { user: { select: { name: true } } } },
        days: { include: { exercises: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.member.findMany({
      where: { status: "ACTIVE" },
      include: { user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.trainer.findMany({
      where: { isActive: true },
      include: { user: { select: { name: true } } },
    }),
  ]);

  return (
    <ProgramBuilderClient
      initialPrograms={programs.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        isActive: p.isActive,
        isTemplate: p.isTemplate,
        startDate: p.startDate.toISOString(),
        endDate: p.endDate?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        memberName: p.member?.user.name ?? null,
        trainerName: p.trainer.user.name ?? null,
        dayCount: p.days.length,
        exerciseCount: p.days.reduce((s, d) => s + d.exercises.length, 0),
      }))}
      members={members.map((m) => ({ id: m.id, name: m.user.name ?? "—" }))}
      trainers={trainers.map((t) => ({ id: t.id, name: t.user.name ?? "—" }))}
    />
  );
}
