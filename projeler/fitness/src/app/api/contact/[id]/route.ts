import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { ContactStatus } from "@prisma/client";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.isRead !== undefined) data.isRead = !!body.isRead;
  if (body.status !== undefined && body.status in ContactStatus) data.status = body.status;
  if (body.adminNote !== undefined) data.adminNote = body.adminNote || null;
  if (body.assignedToId !== undefined) data.assignedToId = body.assignedToId || null;
  if (body.convertedMemberId !== undefined) data.convertedMemberId = body.convertedMemberId || null;

  const updated = await prisma.contactMessage.update({ where: { id }, data });

  if (body.status !== undefined || body.assignedToId !== undefined) {
    await audit({
      userId: admin.sub,
      ip: getClientIp(req),
      action: "lead.update",
      entity: "contactMessage",
      entityId: id,
      meta: { status: body.status, assignedToId: body.assignedToId },
    });
  }

  return NextResponse.json({ message: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  await prisma.contactMessage.delete({ where: { id } });
  await audit({ userId: admin.sub, ip: getClientIp(req), action: "lead.delete", entity: "contactMessage", entityId: id });
  return NextResponse.json({ ok: true });
}
