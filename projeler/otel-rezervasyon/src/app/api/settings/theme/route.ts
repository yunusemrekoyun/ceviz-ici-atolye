import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContextFromRequest(request);

    if (!authContext || authContext.user.roleSlug !== 'admin') {
      return NextResponse.json(
        { ok: false, message: 'Yetkisiz erişim.' },
        { status: 403 }
      );
    }

    const { theme } = await request.json();

    if (!theme) {
      return NextResponse.json(
        { ok: false, message: 'Geçersiz tema.' },
        { status: 400 }
      );
    }

    await prisma.systemSetting.upsert({
      where: { key: 'theme' },
      update: { value: theme },
      create: { key: 'theme', value: theme },
    });

    return NextResponse.json({ ok: true, theme });
  } catch (error) {
    console.error('Theme save error:', error);
    return NextResponse.json(
      { ok: false, message: 'Tema kaydedilirken bir hata oluştu.' },
      { status: 500 }
    );
  }
}
