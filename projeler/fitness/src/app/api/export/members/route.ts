import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { MemberStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  await requireAdmin();

  const sp = req.nextUrl.searchParams;
  const branchId = sp.get("branchId") || undefined;
  const status = sp.get("status") as MemberStatus | null;

  const members = await prisma.member.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      branch: { select: { name: true } },
      trainer: { include: { user: { select: { name: true } } } },
      memberships: {
        where: { isActive: true },
        include: { plan: { select: { name: true } } },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const STATUS_LABELS: Record<MemberStatus, string> = {
    ACTIVE: "Aktif",
    EXPIRED: "Süresi Dolmuş",
    FROZEN: "Dondurulmuş",
    SUSPENDED: "Askıya Alınmış",
    PENDING: "Beklemede",
  };

  const rows = [
    ["Üye No", "Ad Soyad", "E-posta", "Telefon", "Şube", "Eğitmen", "Plan", "Durum", "Kayıt Tarihi"].join(","),
    ...members.map((m) =>
      [
        m.memberNo,
        `"${m.user.name}"`,
        m.user.email,
        m.user.phone || "",
        `"${m.branch?.name || ""}"`,
        `"${m.trainer?.user.name || ""}"`,
        `"${m.memberships[0]?.plan.name || ""}"`,
        STATUS_LABELS[m.status],
        new Date(m.createdAt).toLocaleDateString("tr-TR"),
      ].join(",")
    ),
  ].join("\n");

  return new NextResponse("﻿" + rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="uyeler-${Date.now()}.csv"`,
    },
  });
}
