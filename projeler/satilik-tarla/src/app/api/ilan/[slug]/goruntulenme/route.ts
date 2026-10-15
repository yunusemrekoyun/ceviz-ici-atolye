import { prisma } from '@/lib/prisma';

/** Görüntülenme artışı — public'te render edilmediği için revalidate
 * ÇAĞRILMAZ (aksi halde her görüntüleme sayfa cache'ini düşürürdü). */
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    await prisma.listing.updateMany({
      where: { slug, status: 'aktif' },
      data: { viewCount: { increment: 1 } },
    });
  } catch {
    // Sayaç kritik değil — DB hatası sessizce yutulur
  }
  return new Response(null, { status: 204 });
}
