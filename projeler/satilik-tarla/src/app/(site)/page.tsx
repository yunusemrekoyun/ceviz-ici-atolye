import type { Metadata } from 'next';
import { getFeaturedListings, getListingStats } from '@/lib/data';
import { Home } from '@/components/home/home';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

// Açılış sekansı + vitrin gridi için yeterli: 1 gösterim + 3 kart + slider'da
// gezinecek birkaç fazlası. Ana sayfa TÜM ilanları yüklemez (bkz. src/lib/data.ts).
const FEATURED_COUNT = 12;

export default async function Page() {
  const [listings, stats] = await Promise.all([
    getFeaturedListings(FEATURED_COUNT),
    getListingStats(),
  ]);
  return <Home listings={listings} stats={stats} />;
}
