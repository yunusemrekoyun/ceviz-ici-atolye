import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTrainer } from "@/lib/auth";

// Eğitmenin konuşma listesi: atanmış üyeler + son mesaj + okunmamış sayısı.
export async function GET() {
  try {
    const user = await requireTrainer();
    const trainer = await prisma.trainer.findUnique({ where: { userId: user.sub } });
    if (!trainer) return NextResponse.json({ error: "Eğitmen kaydı bulunamadı" }, { status: 404 });

    const [members, lastMessages, unreadCounts] = await Promise.all([
      prisma.member.findMany({
        where: { trainerId: trainer.id },
        select: { id: true, user: { select: { name: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      }),
      prisma.directMessage.findMany({
        where: { trainerId: trainer.id },
        orderBy: { createdAt: "desc" },
        distinct: ["memberId"],
        select: { memberId: true, body: true, createdAt: true, senderIsTrainer: true },
      }),
      prisma.directMessage.groupBy({
        by: ["memberId"],
        where: { trainerId: trainer.id, senderIsTrainer: false, readAt: null },
        _count: { id: true },
      }),
    ]);

    const lastByMember = new Map(lastMessages.map((m) => [m.memberId, m]));
    const unreadByMember = new Map(unreadCounts.map((u) => [u.memberId, u._count.id]));

    const conversations = members
      .map((m) => {
        const last = lastByMember.get(m.id);
        return {
          memberId: m.id,
          name: m.user.name,
          avatarUrl: m.user.avatarUrl,
          lastMessage: last ? { body: last.body, createdAt: last.createdAt.toISOString(), mine: last.senderIsTrainer } : null,
          unread: unreadByMember.get(m.id) ?? 0,
        };
      })
      .sort((a, b) => {
        const ta = a.lastMessage?.createdAt ?? "";
        const tb = b.lastMessage?.createdAt ?? "";
        return tb.localeCompare(ta);
      });

    return NextResponse.json({ conversations });
  } catch (e) {
    console.error("[trainer/messages GET]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
