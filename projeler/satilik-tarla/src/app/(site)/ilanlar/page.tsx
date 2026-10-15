import type { Metadata } from 'next';
import { Suspense } from 'react';
import { parseSearchParams, searchListings } from '@/lib/listing-search';
import { Browse } from '@/components/listings/browse';

export const metadata: Metadata = {
  title: 'Satılık Tarla, Arsa ve Arazi İlanları',
  description:
    'Kütahya merkez ve ilçelerindeki satılık tarla, arsa, bağ-bahçe ve köy içi arazi ilanlarını ilçeye, türe, imar/tapu durumuna ve fiyata göre filtreleyin.',
  alternates: { canonical: '/ilanlar' },
};

/** Filtre/sayfalama sunucuda çalışır ("binlerce ilan" hedefi) — sayfa bu
 * yüzden istek başına render edilir; sorgular indeksli ve sayfalanmış. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseSearchParams(await searchParams);
  const result = await searchListings(filters);
  return (
    <Suspense fallback={null}>
      <Browse result={result} />
    </Suspense>
  );
}
