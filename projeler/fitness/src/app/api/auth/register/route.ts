import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { setAuthCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validators";
import { Role, MemberStatus } from "@prisma/client";
import { rateLimit } from "@/lib/rate-limit";
import { sendVerificationEmail, sendWelcomeEmail } from "@/lib/email";
import { readSystemSettings } from "@/lib/settings";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const rl = rateLimit(`register:${ip}`, "register");
    if (rl.limited) {
      return NextResponse.json(
        { error: `Çok fazla deneme. ${rl.retryAfter} saniye bekleyin.` },
        { status: 429 }
      );
    }
    const settings = await readSystemSettings();
    if (!settings["system.newMemberRegistration"]) {
      return NextResponse.json(
        { error: "Yeni üye kayıtları şu anda kapalı. Bilgi için salonla iletişime geçebilirsiniz." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }
    const { name, email, password, phone, referralCode } = parsed.data;
    const lower = email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: lower } });
    if (existing) return NextResponse.json({ error: "Bu e-posta zaten kayıtlı" }, { status: 409 });

    const passwordHash = await hashPassword(password);

    const count = await prisma.member.count();
    const memberNo = `BF-${String(count + 1).padStart(6, "0")}`;

    const verificationToken = generateToken();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const referrer = referralCode?.trim()
      ? await prisma.member.findUnique({ where: { referralCode: referralCode.trim() }, select: { id: true } })
      : null;

    const user = await prisma.user.create({
      data: {
        name,
        email: lower,
        phone,
        passwordHash,
        role: Role.MEMBER,
        verificationToken,
        verificationExpiry,
        member: {
          create: {
            memberNo,
            qrCode: `BF-QR-${memberNo}`,
            status: MemberStatus.ACTIVE,
            referralCode: memberNo,
            referredById: referrer?.id,
          },
        },
      },
    });

    await sendVerificationEmail(user.email, user.name, verificationToken).catch(() => {});
    await sendWelcomeEmail(user.email, user.name).catch(() => {});

    await setAuthCookie({
      sub: user.id,
      email: user.email,
      role: user.role as any,
      name: user.name,
    });

    return NextResponse.json({ ok: true, role: user.role });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[register] error:", msg, stack);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
