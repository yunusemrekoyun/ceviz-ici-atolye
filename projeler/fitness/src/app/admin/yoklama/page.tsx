import { prisma } from "@/lib/prisma";
import { AttendanceClient } from "@/components/admin/AttendanceClient";

export default async function AttendancePage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const todayStr = today.toISOString().split("T")[0];

  const [records, total, branches, members] = await Promise.all([
    prisma.attendance.findMany({
      where: { checkIn: { gte: today, lt: tomorrow } },
      include: {
        member: { include: { user: { select: { name: true } } } },
        branch: { select: { name: true } },
      },
      orderBy: { checkIn: "desc" },
      take: 30,
    }),
    prisma.attendance.count({ where: { checkIn: { gte: today, lt: tomorrow } } }),
    prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.member.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, memberNo: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <AttendanceClient
      initialRecords={JSON.parse(JSON.stringify(records))}
      initialTotal={total}
      branches={branches}
      members={JSON.parse(JSON.stringify(members))}
      today={todayStr}
    />
  );
}
