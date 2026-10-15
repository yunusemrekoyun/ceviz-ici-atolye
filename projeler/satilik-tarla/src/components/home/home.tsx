'use client';

import type { Listing } from '@/content';
import type { ListingStats } from '@/lib/data';
import { useStore } from '@/store';
import { OpeningSequence } from './opening-sequence';
import { SearchBand } from './search-band';
import { CategoryTiles } from './category-tiles';
import { FeaturedListings } from './featured-listings';
import { HowItWorks } from './how-it-works';
import { LeadMatch } from './lead-match';
import { SellCta } from './sell-cta';

export function Home({ listings, stats }: { listings: Listing[]; stats: ListingStats }) {
  const { content } = useStore();

  // İlçe kartlarındaki sayılar elle yazılmaz; sunucudan gelen gerçek
  // agregattan türetilir (tüm ilan listesi client'a hiç inmez).
  const districtsWithCounts = content.districts.map((d) => ({
    ...d,
    count: `${stats.byDistrict[d.name] ?? 0} ilan`,
  }));

  return (
    <>
      {/* Açılış sekansı: hero → öne çıkan ilan morph + slider */}
      <OpeningSequence listings={listings} totalCount={stats.total} />
      <SearchBand districts={content.districts.map((d) => d.name)} />
      <FeaturedListings listings={listings} />
      <CategoryTiles districts={districtsWithCounts} />
      <HowItWorks />
      <LeadMatch />
      <SellCta />
    </>
  );
}
