import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProgramBuilderClient } from "@/components/admin/ProgramBuilderClient";

export const metadata = { title: "Programlarım" };

export default async function ProgramlarPage() {
  const user = await requireRole(["TRAINER"]);
  const trainer = await prisma.trainer.findUnique({
    where: { userId: user.sub },
    include: { user: { select: { name: true } } },
  });
  if (!trainer) return null;

  const [programs, members] = await Promise.all([
    prisma.workoutProgram.findMany({
      where: { trainerId: trainer.id },
      include: {
        member: { include: { user: { select: { name: true } } } },
        trainer: { include: { user: { select: { name: true } } } },
        days: { include: { exercises: true }, orderBy: { dayNumber: "asc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.member.findMany({
      where: { trainerId: trainer.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Programlarım</h1>
        <p className="text-body text-sm mt-0.5">Üyelerine atadığın antrenman programları</p>
      </div>

      <ProgramBuilderClient
        initialPrograms={programs.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          memberName: p.member?.user.name ?? null,
          trainerName: p.trainer.user.name ?? null,
          isActive: p.isActive,
          isTemplate: p.isTemplate,
          startDate: p.startDate.toISOString(),
          endDate: p.endDate?.toISOString() ?? null,
          dayCount: p.days.length,
          exerciseCount: p.days.reduce((s, d) => s + d.exercises.length, 0),
          createdAt: p.createdAt.toISOString(),
        }))}
        members={members.map((m) => ({ id: m.id, name: m.user.name }))}
        trainers={[{ id: trainer.id, name: trainer.user.name }]}
      />
    </div>
  );
}
