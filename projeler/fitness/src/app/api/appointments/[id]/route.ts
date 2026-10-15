import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { AppointmentStatus } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const { status, notes } = await req.json();

  const apt = await prisma.appointment.findUnique({ where: { id } });
  if (!apt) return NextResponse.json({ error: "Randevu bulunamadı" }, { status: 404 });

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      ...(status ? { status: status as AppointmentStatus } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
    include: {
      member: { include: { user: { select: { name: true } } } },
      trainer: { include: { user: { select: { name: true } } } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  await prisma.appointment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
