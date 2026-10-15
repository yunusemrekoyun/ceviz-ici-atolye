import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { setAuthCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const rl = rateLimit(`login:${ip}`, "login");
    if (rl.limited) {
      return NextResponse.json(
        { error: `Çok fazla deneme. ${rl.retryAfter} saniye bekleyin.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Geçersiz veri" }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return NextResponse.json({ error: "E-posta veya şifre hatalı" }, { status: 401 });

    const match = await verifyPassword(password, user.passwordHash);
    if (!match) return NextResponse.json({ error: "E-posta veya şifre hatalı" }, { status: 401 });

    if (!user.isActive) {
      return NextResponse.json({ error: "Hesabın devre dışı bırakılmış. Yönetim ile iletişime geç." }, { status: 403 });
    }

    const token = await setAuthCookie({
      sub: user.id,
      email: user.email,
      role: user.role as any,
      name: user.name,
    });

    // Oturum kaydı (cihaz yönetimi + admin giriş geçmişi) + son giriş zamanı
    const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 7 * 1000);
    await Promise.all([
      prisma.session.create({
        data: {
          userId: user.id,
          token,
          userAgent: req.headers.get("user-agent") ?? null,
          ip: getClientIp(req),
          expiresAt,
        },
      }),
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    ]);

    return NextResponse.json({ ok: true, role: user.role, name: user.name });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
