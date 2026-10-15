import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase();
  if (!email) return NextResponse.json({ exists: false });

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  }).catch(() => null);

  return NextResponse.json({ exists: !!user });
}
