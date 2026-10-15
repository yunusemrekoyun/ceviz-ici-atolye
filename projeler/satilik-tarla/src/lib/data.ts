import 'server-only';
import { unstable_cache } from 'next/cache';
import { defaultContent, type Listing } from '@/content';
import { TAGS } from './cache-tags';
import { assembleChrome, mapListingRow, type SiteChrome } from './mappers';
import { slugify } from './slugify';
import { prisma } from './prisma';

/**
 * Public veri katmanı — tag'li unstable_cache + content.ts fallback'i.
 *
 * Fallback tasarımı: build sırasında (ör. VPS Docker build'inde) DATABASE_URL
 * yoktur; her fonksiyon DB hatasında seed'le birebir aynı içerikli
 * defaultContent'e düşer, build DB'siz geçer. unstable_cache hata fırlatan
 * sonucu CACHE'LEMEZ — runtime'da ilk istek/revalidate DB'ye döner; deploy
 * sonrası /api/revalidate çağrısı fallback'le üretilmiş rotaları düşürür.
 */

function logDbFallback(scope: string, err: unknown) {
  const msg = err instanceof Error ? err.message.split('\n')[0] : String(err);
  console.warn(`[data] ${scope}: DB erişilemedi, content.ts fallback (${msg})`);
}

function fallbackChrome(): SiteChrome {
  const { listings: _unused, ...chrome } = defaultContent;
  return structuredClone(chrome);
}

const loadChrome = unstable_cache(
  async (): Promise<SiteChrome> => {
    const [siteContent, stats, districts, features, posts] = await Promise.all([
      prisma.siteContent.findUniqueOrThrow({ where: { id: 1 } }),
      prisma.stat.findMany({ orderBy: { position: 'asc' } }),
      prisma.district.findMany({ orderBy: { position: 'asc' } }),
      prisma.feature.findMany({ orderBy: { position: 'asc' } }),
      prisma.blogPost.findMany({
        where: { status: 'yayinda' },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return assembleChrome({ siteContent, stats, districts, features, posts });
  },
  ['site-chrome'],
  { tags: [TAGS.siteContent, TAGS.articles], revalidate: 300 },
);

export async function getSiteChrome(): Promise<SiteChrome> {
  try {
    return await loadChrome();
  } catch (e) {
    logDbFallback('site-chrome', e);
    return fallbackChrome();
  }
}

export type ListingStats = { total: number; byDistrict: Record<string, number> };

const loadListingStats = unstable_cache(
  async (): Promise<ListingStats> => {
    const [total, grouped] = await Promise.all([
      prisma.listing.count({ where: { status: 'aktif' } }),
      prisma.listing.groupBy({
        by: ['district'],
        where: { status: 'aktif' },
        _count: { _all: true },
      }),
    ]);
    const byDistrict = Object.fromEntries(grouped.map((g) => [g.district, g._count._all]));
    return { total, byDistrict };
  },
  ['listing-stats'],
  { tags: [TAGS.listings], revalidate: 300 },
);

/** Ana sayfanın "X ilan" / ilçe kartı sayaçları için ucuz agregat — tam ilan
 * listesini (açıklama/medya dahil) yüklemeye gerek kalmadan count+groupBy.
 * Eskiden getPublishedListings() tüm satırları çekip JS'te sayıyordu; binlerce
 * ilanda bu hem unstable_cache'in 2MB sınırını aşıyor hem gereksiz yavaştı. */
export async function getListingStats(): Promise<ListingStats> {
  try {
    return await loadListingStats();
  } catch (e) {
    logDbFallback('listing-stats', e);
    const byDistrict: Record<string, number> = {};
    for (const l of defaultContent.listings) {
      byDistrict[l.district] = (byDistrict[l.district] ?? 0) + 1;
    }
    return { total: defaultContent.listings.length, byDistrict };
  }
}

// Rastgele "öne çıkan" seçimi için aday havuzu — en yeni N ilan, cache'lenir;
// seçimin kendisi (shuffle) her çağrıda taze yapılır (bkz. getFeaturedListings).
const FEATURED_POOL_SIZE = 300;

const loadFeaturedPool = unstable_cache(
  async (): Promise<Listing[]> => {
    const rows = await prisma.listing.findMany({
      where: { status: 'aktif', media: { some: {} } },
      include: { media: true },
      orderBy: { publishedAt: 'desc' },
      take: FEATURED_POOL_SIZE,
    });
    return rows.map(mapListingRow);
  },
  ['featured-listings-pool'],
  { tags: [TAGS.listings], revalidate: 300 },
);

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Ana sayfanın açılış sekansı + vitrin gridi için öne çıkan ilanlar —
 * şimdilik bilinçli olarak rastgele (2026-07 kararı; seçim kriteri ileride
 * değişebilir). En yeni {@link FEATURED_POOL_SIZE} ilanlık cache'lenmiş
 * havuzdan her çağrıda taze karılıp `limit` kadarı döner. */
export async function getFeaturedListings(limit: number): Promise<Listing[]> {
  let pool: Listing[];
  try {
    pool = await loadFeaturedPool();
  } catch (e) {
    logDbFallback('featured-listings', e);
    pool = structuredClone(defaultContent.listings);
  }
  return shuffled(pool).slice(0, limit);
}

export async function getListing(slug: string): Promise<Listing | null> {
  const load = unstable_cache(
    async (): Promise<Listing | null> => {
      const row = await prisma.listing.findUnique({
        where: { slug },
        include: { media: true },
      });
      if (!row || row.status !== 'aktif') return null;
      return mapListingRow(row);
    },
    ['listing', slug],
    { tags: [TAGS.listings, TAGS.listing(slug)], revalidate: 3600 },
  );
  try {
    return await load();
  } catch (e) {
    logDbFallback(`listing:${slug}`, e);
    return structuredClone(defaultContent.listings.find((l) => l.id === slug)) ?? null;
  }
}

const loadSitemapEntries = unstable_cache(
  async (): Promise<{ slug: string; updatedAt: Date }[]> => {
    const rows = await prisma.listing.findMany({
      where: { status: 'aktif' },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
    });
    return rows;
  },
  ['sitemap-entries'],
  { tags: [TAGS.listings], revalidate: 3600 },
);

export async function getSitemapEntries(): Promise<{ slug: string; updatedAt: Date }[]> {
  try {
    return await loadSitemapEntries();
  } catch (e) {
    logDbFallback('sitemap-entries', e);
    return defaultContent.listings.map((l) => ({
      slug: l.id,
      updatedAt: new Date(0),
    }));
  }
}

/** LegalDoc içeriği (public /yasal/[key] sayfaları). */
export async function getLegalDoc(key: string) {
  const valid = ['kvkk', 'gizlilik', 'cerez', 'kosullar', 'iys'] as const;
  type LegalKey = (typeof valid)[number];
  if (!valid.includes(key as LegalKey)) return null;
  const load = unstable_cache(
    async () => prisma.legalDoc.findUnique({ where: { key: key as LegalKey } }),
    ['legal-doc', key],
    { tags: [TAGS.siteContent], revalidate: 3600 },
  );
  try {
    return await load();
  } catch (e) {
    logDbFallback(`legal:${key}`, e);
    return null;
  }
}

export type GuidePost = {
  slug: string;
  title: string;
  category: string;
  body: string;
  // ISO string: unstable_cache sonucu JSON round-trip'inden geçer, Date
  // nesnesi hit'te string'e dönüşür (canlıda 500'e yol açtı) — baştan string.
  createdAt: string | null;
};

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Rehber özeti (kart metni) — HTML gövdeden düz metin kırpar. */
export function guideSnippet(body: string, max = 180): string {
  const text = stripHtml(body);
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function fallbackPosts(): GuidePost[] {
  return defaultContent.articles.map((a) => ({
    slug: slugify(a.title),
    title: a.title,
    category: a.category,
    body: a.text,
    createdAt: null,
  }));
}

const loadGuidePosts = unstable_cache(
  async (): Promise<GuidePost[]> =>
    (
      await prisma.blogPost.findMany({
        where: { status: 'yayinda' },
        orderBy: { createdAt: 'desc' },
      })
    ).map((p) => ({
      slug: p.slug,
      title: p.title,
      category: p.category,
      body: p.body,
      createdAt: p.createdAt.toISOString(),
    })),
  ['guide-posts'],
  { tags: [TAGS.articles], revalidate: 300 },
);

export async function getGuidePosts(): Promise<GuidePost[]> {
  try {
    return await loadGuidePosts();
  } catch (e) {
    logDbFallback('guide-posts', e);
    return fallbackPosts();
  }
}

export async function getGuidePost(slug: string): Promise<GuidePost | null> {
  const load = unstable_cache(
    async () => prisma.blogPost.findUnique({ where: { slug } }),
    ['guide-post', slug],
    { tags: [TAGS.articles], revalidate: 3600 },
  );
  try {
    const post = await load();
    if (!post || post.status !== 'yayinda') return null;
    return {
      slug: post.slug,
      title: post.title,
      category: post.category,
      body: post.body,
      createdAt: post.createdAt.toISOString(),
    };
  } catch (e) {
    logDbFallback('guide-post', e);
    return fallbackPosts().find((p) => p.slug === slug) ?? null;
  }
}

export type MapPoint = {
  slug: string;
  title: string;
  price: string;
  area: string;
  district: string;
  type: string;
  lat: number;
  lng: number;
  img: string | null;
};

type MediaVariant = { url?: string };
type ListingRowForMap = {
  slug: string;
  title: string;
  price: string;
  area: string;
  district: string;
  type: string;
  lat: number | null;
  lng: number | null;
  media: { variants: unknown }[];
};

function mapToMapPoint(r: ListingRowForMap): MapPoint {
  const url = ((r.media[0]?.variants as MediaVariant[] | null)?.[0]?.url ?? '') || null;
  return {
    slug: r.slug,
    title: r.title,
    price: r.price,
    area: r.area,
    district: r.district,
    type: r.type,
    lat: r.lat as number,
    lng: r.lng as number,
    img: url,
  };
}

export type MapBounds = { minLat: number; maxLat: number; minLng: number; maxLng: number };

// Tek viewport'ta gösterilecek üst sınır — aşılırsa çağıran taraf (HaritaMap)
// kullanıcıyı yakınlaştırmaya yönlendirir (bkz. 2026-07-22 ölçek testi:
// harita önceden TÜM aktif ilanları (binlerce) tek seferde gönderiyordu).
export const MAP_POINTS_LIMIT = 300;

/** Haritanın görünür alanındaki (viewport) aktif ilanlar — canlı sorgu,
 * kasıtlı olarak cache'lenmez (sınırlar sürekli/kullanıcıya özel değişir;
 * `status` index'i zaten satır sayısını daraltıyor, lat/lng aralığı ucuz
 * bir kalan filtre). */
export async function getMapPointsInBounds(bounds: MapBounds): Promise<MapPoint[]> {
  try {
    const rows = await prisma.listing.findMany({
      where: {
        status: 'aktif',
        lat: { gte: bounds.minLat, lte: bounds.maxLat },
        lng: { gte: bounds.minLng, lte: bounds.maxLng },
      },
      include: { media: { where: { type: 'image' }, orderBy: { position: 'asc' }, take: 1 } },
      orderBy: { publishedAt: 'desc' },
      take: MAP_POINTS_LIMIT,
    });
    return rows.map(mapToMapPoint);
  } catch (e) {
    logDbFallback('map-points-bounds', e);
    return defaultContent.listings
      .filter(
        (l) =>
          l.lat >= bounds.minLat &&
          l.lat <= bounds.maxLat &&
          l.lng >= bounds.minLng &&
          l.lng <= bounds.maxLng,
      )
      .map((l) => ({
        slug: l.id,
        title: l.title,
        price: l.price,
        area: l.area,
        district: l.district,
        type: l.type,
        lat: l.lat,
        lng: l.lng,
        img: l.images[0] ?? null,
      }));
  }
}
