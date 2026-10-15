import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/get-session';

/** Zil dropdown'ı: son 15 bildirim + okunmamış sayısı. */
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ items: [], unread: 0 });

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: { id: true, title: true, body: true, href: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({
      where: { userId: session.user.id, readAt: null },
    }),
  ]);
  return NextResponse.json({ items, unread });
}

/** Dropdown açılınca tümü okundu sayılır. */
export async function POST() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
