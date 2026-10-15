import argon2 from 'argon2';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { issueAuthSession, setAuthCookies } from '@/lib/auth/session';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

const loginSchema = z.object({
  email: z.string().email().max(254).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(200),
});

// A real argon2 hash verified against when the account doesn't exist, so login
// timing doesn't reveal whether an email is registered (user enumeration).
const DUMMY_HASH = '$argon2id$v=19$m=65536,t=3,p=4$sjQOB0sayCaM3tNJAjt5Uw$5cl8eDYR1T7gMJycw02LOxzln+IZNCUJ2Xu1QaM0KzE';

function invalidCredentials() {
  return NextResponse.json(
    { ok: false, message: 'Email veya şifre hatalı.' },
    { status: 401 },
  );
}

export async function POST(request: NextRequest) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return invalidCredentials();
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        email: parsed.data.email,
      },
      include: {
        role: true,
      },
    });

    // Constant-ish timing: verify against a real hash even when the account is
    // missing/inactive so the response time doesn't reveal whether the email
    // exists. (The check-email endpoint is also rate-limited at the edge.)
    const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
    const passwordMatches = await argon2.verify(hashToCheck, parsed.data.password).catch(() => false);

    if (!user || !user.isActive || !passwordMatches) {
      return invalidCredentials();
    }

    const issued = await issueAuthSession({
      user,
      request,
    });

    const response = NextResponse.json({
      ok: true,
      user: issued.user,
      redirectTo: `/${issued.user.roleSlug}`,
    });

    setAuthCookies(response, issued.accessToken, issued.refreshToken);

    await writeAuditLog({
      request,
      auth: { user: issued.user, sessionId: '', source: 'access' },
      action: 'auth.login',
      entityType: 'user',
      entityId: issued.user.id,
      summary: `Oturum açıldı: ${issued.user.email}`,
    });

    return response;
  } catch (error) {
    console.error('Login failed.', error);

    return NextResponse.json(
      { ok: false, message: 'Login işlemi şu anda tamamlanamadı.' },
      { status: 503 },
    );
  }
}
