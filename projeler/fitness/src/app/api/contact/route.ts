import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sendContactNotificationEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  await requireAdmin();
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`contact:${ip}`, "register");
  if (rl.limited) {
    return NextResponse.json({ error: `Çok fazla deneme. ${rl.retryAfter} saniye bekleyin.` }, { status: 429 });
  }

  const body = await req.json();
  const { name, email, phone, message } = body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Ad, e-posta ve mesaj zorunlu" }, { status: 400 });
  }

  const contactMessage = await prisma.contactMessage.create({
    data: {
      name: name.trim().slice(0, 200),
      email: email.trim().slice(0, 200),
      phone: phone?.trim().slice(0, 40) || null,
      message: message.trim().slice(0, 5000),
    },
  });

  const notifyTo = await prisma.siteSetting.findUnique({ where: { key: "contact.email" } });
  await sendContactNotificationEmail(notifyTo?.value || "info@bahafitness.com", contactMessage);

  return NextResponse.json({ ok: true }, { status: 201 });
}
