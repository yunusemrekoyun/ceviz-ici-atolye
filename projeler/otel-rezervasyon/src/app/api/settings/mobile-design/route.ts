import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';

export const runtime = 'nodejs';

const VALID = ['new', 'classic'] as const;
type MobileDesign = (typeof VALID)[number];

function normalize(value: string | null | undefined): MobileDesign {
  return value === 'classic' ? 'classic' : 'new';
}

export async function GET() {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'mobile_design' } });
    return NextResponse.json({ ok: true, mobileDesign: normalize(setting?.value) });
  } catch (error) {
    console.error('mobile_design load error:', error);
    // Default to the new design if it can't be read.
    return NextResponse.json({ ok: false, mobileDesign: 'new' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthContextFromRequest(request);
    if (!auth || auth.user.roleSlug !== 'admin') {
      return NextResponse.json({ ok: false, message: 'Yetkisiz erişim.' }, { status: 403 });
    }

    const { mobileDesign } = await request.json();
    if (!VALID.includes(mobileDesign)) {
      return NextResponse.json({ ok: false, message: 'Geçersiz seçim.' }, { status: 400 });
    }

    await prisma.systemSetting.upsert({
      where: { key: 'mobile_design' },
      update: { value: mobileDesign },
      create: { key: 'mobile_design', value: mobileDesign },
    });

    return NextResponse.json({ ok: true, mobileDesign });
  } catch (error) {
    console.error('mobile_design save error:', error);
    return NextResponse.json({ ok: false, message: 'Kaydedilirken bir hata oluştu.' }, { status: 500 });
  }
}
