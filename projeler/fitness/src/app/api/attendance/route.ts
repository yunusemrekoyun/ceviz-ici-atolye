import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { MemberStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  await requireAdmin();

  const sp = req.nextUrl.searchParams;
  const branchId = sp.get("branchId") || undefined;
  const date = sp.get("date"); // YYYY-MM-DD
  const memberId = sp.get("memberId") || undefined;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const limit = 30;
  const skip = (page - 1) * limit;

  let dateFilter: { gte: Date; lt: Date } | undefined;
  if (date) {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    dateFilter = { gte: d, lt: next };
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateFilter = { gte: today, lt: new Date(today.getTime() + 86400000) };
  }

  const where: any = {
    checkIn: dateFilter,
    ...(branchId ? { branchId } : {}),
    ...(memberId ? { memberId } : {}),
  };

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: {
        member: { include: { user: { select: { name: true } } } },
        branch: { select: { name: true } },
      },
      orderBy: { checkIn: "desc" },
      skip,
      take: limit,
    }),
    prisma.attendance.count({ where }),
  ]);

  return NextResponse.json({ data: records, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  await requireAdmin();

  const body = await req.json();
  const { qrCode, memberId: directMemberId, branchId, source = "MANUAL" } = body;

  let memberId = directMemberId;

  if (qrCode && !memberId) {
    const member = await prisma.member.findUnique({ where: { qrCode } });
    if (!member) {
      return NextResponse.json({ error: "QR kod bulunamadı" }, { status: 404 });
    }
    if (member.status !== MemberStatus.ACTIVE) {
      return NextResponse.json({ error: "Üyelik aktif değil", memberName: (await prisma.user.findUnique({ where: { id: member.userId }, select: { name: true } }))?.name }, { status: 403 });
    }
    memberId = member.id;
  }

  if (!memberId) {
    return NextResponse.json({ error: "memberId veya qrCode zorunlu" }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dup = await prisma.attendance.findFirst({ where: { memberId, checkIn: { gte: today } } });
  if (dup) {
    const member = await prisma.member.findUnique({ where: { id: memberId }, include: { user: { select: { name: true } } } });
    return NextResponse.json({ error: "Bu üye bugün zaten check-in yapmış", memberName: member?.user.name }, { status: 409 });
  }

  const att = await prisma.attendance.create({
    data: { memberId, source, branchId: branchId || null },
    include: {
      member: { include: { user: { select: { name: true, avatarUrl: true } } } },
      branch: { select: { name: true } },
    },
  });

  return NextResponse.json({ attendance: att }, { status: 201 });
}
