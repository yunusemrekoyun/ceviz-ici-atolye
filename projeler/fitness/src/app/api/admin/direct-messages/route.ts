import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ok, withHandler } from "@/lib/api-handler";

// Yönetim için salt-okunur eğitmen↔üye yazışma görüntüleyici.
export const GET = withHandler(async (req: NextRequest) => {
  await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const memberId = sp.get("memberId");
  const trainerId = sp.get("trainerId");

  // Tek bir konuşmanın mesajları
  if (memberId && trainerId) {
    const messages = await prisma.directMessage.findMany({
      where: { memberId, trainerId },
      orderBy: { createdAt: "asc" },
      select: { id: true, body: true, senderIsTrainer: true, createdAt: true },
    });
    return ok({
      messages: messages.map((m) => ({
        id: m.id,
        body: m.body,
        senderIsTrainer: m.senderIsTrainer,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  }

  // Konuşma listesi: her (üye, eğitmen) çifti için en son mesaj
  const latest = await prisma.directMessage.findMany({
    orderBy: { createdAt: "desc" },
    distinct: ["memberId", "trainerId"],
    select: {
      memberId: true,
      trainerId: true,
      body: true,
      createdAt: true,
      senderIsTrainer: true,
      member: { select: { user: { select: { name: true } } } },
      trainer: { select: { user: { select: { name: true } } } },
    },
  });

  const conversations = latest.map((m) => ({
    memberId: m.memberId,
    trainerId: m.trainerId,
    memberName: m.member.user.name,
    trainerName: m.trainer.user.name,
    lastMessage: { body: m.body, createdAt: m.createdAt.toISOString(), fromTrainer: m.senderIsTrainer },
  }));

  return ok({ conversations });
});
