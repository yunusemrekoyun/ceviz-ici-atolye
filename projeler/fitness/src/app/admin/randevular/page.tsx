import { prisma } from "@/lib/prisma";
import { AppointmentsClient } from "@/components/admin/AppointmentsClient";
import { AppointmentStatus, MemberStatus } from "@prisma/client";

export default async function AppointmentsPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [appointments, members, trainers] = await Promise.all([
    prisma.appointment.findMany({
      where: { startAt: { gte: startOfMonth } },
      include: {
        member: { include: { user: { select: { name: true } } } },
        trainer: { include: { user: { select: { name: true, avatarUrl: true } } } },
      },
      orderBy: { startAt: "asc" },
      take: 100,
    }),
    prisma.member.findMany({
      where: { status: MemberStatus.ACTIVE },
      select: { id: true, memberNo: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.trainer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        specialty: true,
        user: { select: { name: true, avatarUrl: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <AppointmentsClient
      initialAppointments={JSON.parse(JSON.stringify(appointments))}
      members={members}
      trainers={JSON.parse(JSON.stringify(trainers))}
    />
  );
}
