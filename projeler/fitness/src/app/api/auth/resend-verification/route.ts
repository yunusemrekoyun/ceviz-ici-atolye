import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST() {
  const authUser = await requireUser();

  const user = await prisma.user.findUnique({ where: { id: authUser.sub } });
  if (!user) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  if (user.emailVerified) {
    return NextResponse.json({ error: "E-posta zaten doğrulanmış" }, { status: 400 });
  }

  const token = generateToken();
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { verificationToken: token, verificationExpiry: expiry },
  });

  await sendVerificationEmail(user.email, user.name, token).catch(() => {});

  return NextResponse.json({ ok: true });
}
