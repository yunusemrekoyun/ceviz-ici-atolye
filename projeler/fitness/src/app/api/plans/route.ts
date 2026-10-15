import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { PlanInterval } from "@prisma/client";

export async function GET() {
  // Public; aktif planları herkes görebilir (kayıt akışı için)
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ plans });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  const b = await req.json();
  if (!b.name || !b.price || !b.durationDays) {
    return NextResponse.json({ error: "name, price, durationDays zorunlu" }, { status: 400 });
  }
  const plan = await prisma.plan.create({
    data: {
      name: b.name,
      description: b.description || null,
      price: Number(b.price),
      interval: (b.interval || "MONTHLY") as PlanInterval,
      durationDays: Number(b.durationDays),
      features: Array.isArray(b.features) ? b.features : [],
      isPopular: !!b.isPopular,
      isActive: b.isActive !== false,
      order: b.order ? Number(b.order) : 0,
    },
  });
  await audit({ userId: admin.sub, ip: getClientIp(req), action: "plan.create", entity: "plan", entityId: plan.id, meta: { name: plan.name, price: Number(plan.price) } });
  return NextResponse.json({ plan });
}
