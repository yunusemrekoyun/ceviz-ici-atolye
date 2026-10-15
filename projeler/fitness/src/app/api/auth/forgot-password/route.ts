import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const rl = rateLimit(`forgot:${ip}`, "register");
  if (rl.limited) {
    return NextResponse.json({ error: `Çok fazla deneme. ${rl.retryAfter} saniye bekleyin.` }, { status: 429 });
  }

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "E-posta gerekli" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Always return success to prevent email enumeration
  if (!user) return NextResponse.json({ ok: true });

  const token = generateToken();
  const expiry = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  });

  await sendPasswordResetEmail(user.email, user.name, token);

  const devToken = process.env.NODE_ENV === "development" ? token : undefined;
  return NextResponse.json({ ok: true, ...(devToken ? { devToken } : {}) });
}
