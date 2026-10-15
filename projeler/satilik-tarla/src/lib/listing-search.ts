// /ilanlar sunucu sorgusu — çekirdek kurucular search-core'da (worker da
// kullanıyor); burada yalnız Prisma erişimi ve sayfalama var.
import 'server-only';
import { prisma } from './prisma';
import { mapListingRow } from './mappers';
import type { Listing } from '@/content';
import { PAGE_SIZE, buildWhere, parseSearchParams, type SearchFilters } from './search-core';
import type { Prisma } from '@prisma/client';

export { PAGE_SIZE, buildWhere, parseSearchParams, type SearchFilters };

function orderBy(sirala: string): Prisma.ListingOrderByWithRelationInput[] {
  switch (sirala) {
    case 'fiyat-artan':
      return [{ priceValue: 'asc' }];
    case 'fiyat-azalan':
      return [{ priceValue: 'desc' }];
    case 'alan-buyuk':
      return [{ areaM2: 'desc' }];
    default:
      return [{ publishedAt: 'desc' }, { createdAt: 'desc' }];
  }
}

export type SearchResult = {
  listings: Listing[];
  total: number;
  page: number;
  pageCount: number;
  facets: { district: Record<string, number>; type: Record<string, number> };
};

export async function searchListings(f: SearchFilters): Promise<SearchResult> {
  const where = buildWhere(f);
  // Facet sayaçları: kendi boyutunun filtresi HARİÇ diğer filtrelerle
  const whereNoDistrict = buildWhere({ ...f, ilce: undefined });
  const whereNoType = buildWhere({ ...f, tur: undefined });

  const [total, rows, byDistrict, byType] = await Promise.all([
    prisma.listing.count({ where }),
    prisma.listing.findMany({
      where,
      orderBy: orderBy(f.sirala),
      skip: (f.sayfa - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { media: { orderBy: { position: 'asc' } } },
    }),
    prisma.listing.groupBy({ by: ['district'], where: whereNoDistrict, _count: true }),
    prisma.listing.groupBy({ by: ['type'], where: whereNoType, _count: true }),
  ]);

  return {
    listings: rows.map(mapListingRow),
    total,
    page: f.sayfa,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    facets: {
      district: Object.fromEntries(byDistrict.map((g) => [g.district, g._count])),
      type: Object.fromEntries(byType.map((g) => [g.type, g._count])),
    },
  };
}
