import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

// Üyenin kendi eğitmeniyle olan mesaj akışı.
export async function GET() {
  try {
    const user = await requireUser();
    const member = await prisma.member.findUnique({
      where: { userId: user.sub },
      include: { trainer: { include: { user: { select: { name: true, avatarUrl: true } } } } },
    });
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });
    if (!member.trainerId || !member.trainer) {
      return NextResponse.json({ trainer: null, messages: [] });
    }

    const messages = await prisma.directMessage.findMany({
      where: { memberId: member.id, trainerId: member.trainerId },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    // Eğitmenden gelenleri okundu işaretle.
    await prisma.directMessage.updateMany({
      where: { memberId: member.id, trainerId: member.trainerId, senderIsTrainer: true, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({
      trainer: { name: member.trainer.user.name, avatarUrl: member.trainer.user.avatarUrl },
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        mine: !m.senderIsTrainer,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[panel/messages GET]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const rl = rateLimit(`msg:${user.sub}`, "api");
    if (rl.limited) {
      return NextResponse.json({ error: "Çok hızlı mesaj gönderiyorsun, biraz bekle." }, { status: 429 });
    }

    const { body } = await req.json();
    const text = typeof body === "string" ? body.trim() : "";
    if (!text) return NextResponse.json({ error: "Mesaj boş olamaz" }, { status: 400 });
    if (text.length > 2000) return NextResponse.json({ error: "Mesaj çok uzun" }, { status: 400 });

    const member = await prisma.member.findUnique({ where: { userId: user.sub } });
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });
    if (!member.trainerId) {
      return NextResponse.json({ error: "Sana atanmış bir eğitmen yok" }, { status: 400 });
    }

    const message = await prisma.directMessage.create({
      data: {
        memberId: member.id,
        trainerId: member.trainerId,
        senderIsTrainer: false,
        body: text,
      },
    });

    return NextResponse.json(
      { message: { id: message.id, body: message.body, mine: true, createdAt: message.createdAt.toISOString() } },
      { status: 201 }
    );
  } catch (e) {
    console.error("[panel/messages POST]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
