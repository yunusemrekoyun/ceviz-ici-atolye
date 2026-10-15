import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { PlanInterval } from "@prisma/client";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const b = await req.json();
  const plan = await prisma.plan.update({
    where: { id },
    data: {
      ...(b.name !== undefined && { name: b.name }),
      ...(b.description !== undefined && { description: b.description || null }),
      ...(b.price !== undefined && { price: Number(b.price) }),
      ...(b.interval !== undefined && { interval: b.interval as PlanInterval }),
      ...(b.durationDays !== undefined && { durationDays: Number(b.durationDays) }),
      ...(b.features !== undefined && { features: Array.isArray(b.features) ? b.features : [] }),
      ...(b.isPopular !== undefined && { isPopular: !!b.isPopular }),
      ...(b.isActive !== undefined && { isActive: !!b.isActive }),
      ...(b.order !== undefined && { order: Number(b.order) }),
    },
  });
  await audit({ userId: admin.sub, ip: getClientIp(req), action: "plan.update", entity: "plan", entityId: id, meta: { fields: Object.keys(b) } });
  return NextResponse.json({ plan });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  // Hard delete tehlikeli; plan kullanılıyorsa pasifleştirelim
  const used = await prisma.membership.count({ where: { planId: id } });
  if (used > 0) {
    await prisma.plan.update({ where: { id }, data: { isActive: false } });
    await audit({ userId: admin.sub, ip: getClientIp(req), action: "plan.deactivate", entity: "plan", entityId: id, meta: { reason: "in-use", memberships: used } });
    return NextResponse.json({ ok: true, soft: true });
  }
  await prisma.plan.delete({ where: { id } });
  await audit({ userId: admin.sub, ip: getClientIp(req), action: "plan.delete", entity: "plan", entityId: id });
  return NextResponse.json({ ok: true });
}
