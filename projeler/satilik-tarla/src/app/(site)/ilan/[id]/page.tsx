import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getListing, getSitemapEntries } from '@/lib/data';
import { ListingDetail } from '@/components/listings/listing-detail';
import { ListingJsonLd } from '@/components/seo/listing-jsonld';
import { TrackView } from '@/components/listings/track-view';

/** En yeni yayındaki ilanlar build'de statik üretilir (DB yoksa seed
 * fallback'i); geri kalanı (uzun kuyruk + sonradan eklenenler) ilk istekte
 * üretilip cache'lenir. Binlerce ilanda TÜMÜNÜ build anında üretmeye
 * çalışmak `next build`'in paralel worker'larının DB bağlantı havuzunu
 * tüketmesine yol açıyordu (bkz. 2026-07-22 ölçek testi, 5000+ ilan) —
 * ayrıca dynamicParams zaten aynı sonucu (tam SSR HTML) ilk istekte üretiyor,
 * yalnızca build anında değil. */
export const dynamicParams = true;
const PRERENDER_COUNT = 100;

export async function generateStaticParams() {
  // Yalnızca slug listesi gerekir (sitemap ile aynı ihtiyaç) — tüm ilan
  // gövdelerini (açıklama/medya dahil) yüklemek binlerce ilanda unstable_cache
  // yazımını 2MB sınırında sessizce başarısız kılıyordu.
  const entries = await getSitemapEntries();
  return entries.slice(0, PRERENDER_COUNT).map((e) => ({ id: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) {
    return { title: 'İlan — Kütahya Satılık Tarla' };
  }
  return {
    title: listing.title,
    description:
      `${listing.location} · ${listing.area} · ${listing.price}. ${listing.description ?? ''}`.slice(
        0,
        160,
      ),
    alternates: { canonical: `/ilan/${listing.id}` },
    openGraph: listing.images[0] ? { images: [listing.images[0]] } : undefined,
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  return (
    <>
      <ListingJsonLd listing={listing} />
      <ListingDetail listing={listing} />
      <TrackView slug={listing.id} />
    </>
  );
}
