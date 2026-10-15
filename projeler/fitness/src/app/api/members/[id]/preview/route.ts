import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

// Admin, Staff ve Trainer görüntüleyebilir
export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    await requireRole(["ADMIN", "STAFF", "TRAINER"]);
    const { id } = await ctx.params;

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, avatarUrl: true, phone: true } },
        memberships: {
          where: { isActive: true },
          include: { plan: true },
          orderBy: { endDate: "desc" },
          take: 1,
        },
        attendances: { orderBy: { checkIn: "desc" }, take: 1 },
        measurements: { orderBy: { recordedAt: "desc" }, take: 1 },
      },
    });

    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    const active = member.memberships[0] ?? null;
    const last   = member.attendances[0] ?? null;
    const meas   = member.measurements[0] ?? null;

    return NextResponse.json({
      id:       member.id,
      memberNo: member.memberNo,
      name:     member.user.name,
      email:    member.user.email,
      phone:    member.user.phone ?? null,
      avatarUrl: member.user.avatarUrl ?? null,
      status:   member.status,
      gender:   member.gender,
      birthDate: member.birthDate?.toISOString() ?? null,
      activePlan: active
        ? { name: active.plan.name, endDate: active.endDate.toISOString() }
        : null,
      lastCheckIn: last?.checkIn.toISOString() ?? null,
      lastWeight: meas?.weightKg ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
}
