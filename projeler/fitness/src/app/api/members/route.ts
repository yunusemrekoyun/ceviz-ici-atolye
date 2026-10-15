import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { audit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { Role, MemberStatus, PaymentStatus, PaymentMethod } from "@prisma/client";

export async function GET(req: Request) {
  await requireAdmin();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") as MemberStatus | null;
  const skip = +(searchParams.get("skip") || 0);
  const take = Math.min(+(searchParams.get("take") || 20), 100);

  const where: any = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { memberNo: { contains: q, mode: "insensitive" } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.member.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, phone: true, avatarUrl: true } },
        memberships: {
          where: { isActive: true },
          include: { plan: { select: { name: true } } },
          take: 1,
          orderBy: { endDate: "desc" },
        },
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    }),
    prisma.member.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  const body = await req.json();

  const {
    name,
    email,
    phone,
    password = "geciciSifre123",
    gender,
    birthDate,
    heightCm,
    startWeightKg,
    goal,
    healthNotes,
    branchId,
    trainerId,
    planId,
    paymentMethod = "CARD",
    paymentAmount,
    paymentStatus = "PAID",
  } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "İsim ve e-posta zorunlu" }, { status: 400 });
  }

  const lower = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: lower } });
  if (existing) return NextResponse.json({ error: "Bu e-posta zaten kayıtlı" }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const count = await prisma.member.count();
  const memberNo = `BF-${String(count + 1).padStart(6, "0")}`;

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email: lower,
        phone: phone || null,
        passwordHash,
        role: Role.MEMBER,
        emailVerified: new Date(),
        member: {
          create: {
            memberNo,
            qrCode: `BF-QR-${memberNo}`,
            status: MemberStatus.ACTIVE,
            referralCode: memberNo,
            gender: gender || null,
            birthDate: birthDate ? new Date(birthDate) : null,
            heightCm: heightCm ? Number(heightCm) : null,
            startWeightKg: startWeightKg ? Number(startWeightKg) : null,
            goal: goal || null,
            healthNotes: healthNotes || null,
            branchId: branchId || null,
            trainerId: trainerId || null,
          },
        },
      },
      include: { member: true },
    });

    if (planId && user.member) {
      const plan = await tx.plan.findUnique({ where: { id: planId } });
      if (plan) {
        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + plan.durationDays);

        const ms = await tx.membership.create({
          data: {
            memberId: user.member.id,
            planId: plan.id,
            startDate: start,
            endDate: end,
            isActive: true,
          },
        });

        const pCount = await tx.payment.count();
        await tx.payment.create({
          data: {
            memberId: user.member.id,
            membershipId: ms.id,
            amount: paymentAmount ? Number(paymentAmount) : Number(plan.price),
            method: paymentMethod as PaymentMethod,
            status: paymentStatus as PaymentStatus,
            paidAt: paymentStatus === "PAID" ? new Date() : null,
            invoiceNo: `INV-${new Date().getFullYear()}-${String(pCount + 1).padStart(4, "0")}`,
          },
        });
      }
    }

    return user;
  });

  await audit({
    userId: admin.sub,
    ip: getClientIp(req),
    action: "member.create",
    entity: "member",
    entityId: result.member?.id,
    meta: { memberNo, name, email: lower },
  });

  return NextResponse.json({ ok: true, user: result });
}
