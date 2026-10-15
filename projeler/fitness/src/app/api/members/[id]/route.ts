import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      user: true,
      memberships: { include: { plan: true }, orderBy: { endDate: "desc" } },
      payments: { orderBy: { createdAt: "desc" }, take: 10 },
      attendances: { orderBy: { checkIn: "desc" }, take: 10 },
      measurements: { orderBy: { recordedAt: "desc" }, take: 10 },
    },
  });
  if (!member) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  return NextResponse.json({ member });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const body = await req.json();

  const member = await prisma.member.findUnique({ where: { id }, select: { userId: true } });
  if (!member) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  // Ayrı tx: önce User, sonra Member
  const updated = await prisma.$transaction(async (tx) => {
    if (body.name || body.email || body.phone) {
      await tx.user.update({
        where: { id: member.userId },
        data: {
          ...(body.name && { name: body.name }),
          ...(body.email && { email: body.email.toLowerCase() }),
          ...(body.phone !== undefined && { phone: body.phone || null }),
        },
      });
    }

    return tx.member.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.gender !== undefined && { gender: body.gender || null }),
        ...(body.birthDate !== undefined && { birthDate: body.birthDate ? new Date(body.birthDate) : null }),
        ...(body.heightCm !== undefined && { heightCm: body.heightCm ? Number(body.heightCm) : null }),
        ...(body.startWeightKg !== undefined && { startWeightKg: body.startWeightKg ? Number(body.startWeightKg) : null }),
        ...(body.goal !== undefined && { goal: body.goal || null }),
        ...(body.healthNotes !== undefined && { healthNotes: body.healthNotes || null }),
        ...(body.trainerId !== undefined && { trainerId: body.trainerId || null }),
        ...(body.branchId !== undefined && { branchId: body.branchId || null }),
      },
    });
  });

  await audit({
    userId: admin.sub,
    ip: getClientIp(req),
    action: "member.update",
    entity: "member",
    entityId: id,
    meta: { fields: Object.keys(body), status: body.status },
  });

  return NextResponse.json({ member: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const m = await prisma.member.findUnique({
    where: { id },
    select: { userId: true, memberNo: true, user: { select: { name: true } } },
  });
  if (!m) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  await prisma.user.delete({ where: { id: m.userId } });

  await audit({
    userId: admin.sub,
    ip: getClientIp(req),
    action: "member.delete",
    entity: "member",
    entityId: id,
    meta: { memberNo: m.memberNo, name: m.user.name },
  });

  return NextResponse.json({ ok: true });
}
