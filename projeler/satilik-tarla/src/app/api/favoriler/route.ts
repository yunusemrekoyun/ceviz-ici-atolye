import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/get-session';

/** Oturumlu kullanıcının favori slug listesi — kalp butonlarının ilk durumu.
 * Kartlar statik/ISR üretildiği için kullanıcıya özel durum client'ta yüklenir. */
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ slugs: [] });
  const rows = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    select: { listing: { select: { slug: true } } },
  });
  return NextResponse.json({ slugs: rows.map((r) => r.listing.slug) });
}
