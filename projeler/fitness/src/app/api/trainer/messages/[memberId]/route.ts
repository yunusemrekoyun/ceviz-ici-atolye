import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTrainer } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ memberId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireTrainer();
    const { memberId } = await params;

    const trainer = await prisma.trainer.findUnique({ where: { userId: user.sub } });
    if (!trainer) return NextResponse.json({ error: "Eğitmen kaydı bulunamadı" }, { status: 404 });

    const member = await prisma.member.findFirst({
      where: { id: memberId, trainerId: trainer.id },
      select: { id: true, user: { select: { name: true, avatarUrl: true } } },
    });
    if (!member) return NextResponse.json({ error: "Üye bulunamadı" }, { status: 404 });

    const messages = await prisma.directMessage.findMany({
      where: { memberId, trainerId: trainer.id },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    await prisma.directMessage.updateMany({
      where: { memberId, trainerId: trainer.id, senderIsTrainer: false, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({
      member: { name: member.user.name, avatarUrl: member.user.avatarUrl },
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        mine: m.senderIsTrainer,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[trainer/messages/member GET]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireTrainer();
    const { memberId } = await params;

    const rl = rateLimit(`msg:${user.sub}`, "api");
    if (rl.limited) {
      return NextResponse.json({ error: "Çok hızlı mesaj gönderiyorsun, biraz bekle." }, { status: 429 });
    }

    const { body } = await req.json();
    const text = typeof body === "string" ? body.trim() : "";
    if (!text) return NextResponse.json({ error: "Mesaj boş olamaz" }, { status: 400 });
    if (text.length > 2000) return NextResponse.json({ error: "Mesaj çok uzun" }, { status: 400 });

    const trainer = await prisma.trainer.findUnique({ where: { userId: user.sub } });
    if (!trainer) return NextResponse.json({ error: "Eğitmen kaydı bulunamadı" }, { status: 404 });

    const member = await prisma.member.findFirst({ where: { id: memberId, trainerId: trainer.id } });
    if (!member) return NextResponse.json({ error: "Bu üye sana atanmamış" }, { status: 403 });

    const message = await prisma.directMessage.create({
      data: {
        memberId,
        trainerId: trainer.id,
        senderIsTrainer: true,
        body: text,
      },
    });

    return NextResponse.json(
      { message: { id: message.id, body: message.body, mine: true, createdAt: message.createdAt.toISOString() } },
      { status: 201 }
    );
  } catch (e) {
    console.error("[trainer/messages/member POST]", e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
