import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { TAGS } from '@/lib/cache-tags';

/** Deploy sonrası cache düşürme: seed/migrate bittikten sonra deploy.sh
 * bu ucu çağırır; DB'siz build'de fallback içerikle üretilmiş ISR sayfaları
 * deterministik olarak tazelenir. Bearer REVALIDATE_SECRET ister. */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  const header = request.headers.get('authorization') ?? '';
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Gövdede { slug } varsa yalnız o ilanın tag'leri düşürülür (worker medya
  // işleme bittiğinde çağırır); gövdesiz çağrı deploy-sonrası tam tazelemedir.
  const body = await request.json().catch(() => null);
  const slug = typeof body?.slug === 'string' ? body.slug : null;

  if (slug) {
    revalidateTag(TAGS.listings, 'max');
    revalidateTag(TAGS.listing(slug), 'max');
    return NextResponse.json({ ok: true, revalidated: slug });
  }

  revalidateTag(TAGS.siteContent, 'max');
  revalidateTag(TAGS.listings, 'max');
  revalidateTag(TAGS.articles, 'max');
  // Tüm sayfa cache'i (ilan detayları dahil) kökten tazelenir
  revalidatePath('/', 'layout');

  return NextResponse.json({ ok: true, revalidated: true });
}
