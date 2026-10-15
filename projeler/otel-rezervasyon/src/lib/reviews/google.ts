import { prisma } from '@/lib/prisma';

export interface PublicReviewItem {
  id: string;
  source: 'internal' | 'google';
  userName: string;
  rating: number;
  comment: string;
  date: string;
  roomName?: string;
}

export interface ReviewSummary {
  source: 'google' | 'dummy';
  enabled: boolean;
  rating: number;
  count: number;
  labelTr: string;
  labelEn: string;
  reviews: PublicReviewItem[];
}

const CACHE_KEY = 'google_reviews_cache_v1';

function envEnabled() {
  return process.env.GOOGLE_REVIEWS_ENABLED === 'true';
}

function cacheTtlMs() {
  const seconds = Number(process.env.GOOGLE_REVIEWS_CACHE_TTL_SECONDS ?? 21600);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 21600 * 1000;
}

export function dummyReviewSummary(): ReviewSummary {
  return {
    source: 'dummy',
    enabled: false,
    rating: 4.8,
    count: 99,
    labelTr: 'Misafir Memnuniyeti',
    labelEn: 'Guest Satisfaction',
    reviews: [],
  };
}

function toSafeRating(value: unknown) {
  const rating = Number(value);
  return Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0;
}

function normalizeGoogleReview(item: {
  name?: string;
  rating?: number;
  relativePublishTimeDescription?: string;
  publishTime?: string;
  text?: { text?: string };
  originalText?: { text?: string };
  authorAttribution?: { displayName?: string };
}, index: number): PublicReviewItem | null {
  const comment = item.text?.text || item.originalText?.text || '';
  if (!comment.trim()) return null;

  return {
    id: item.name || `google-${index}`,
    source: 'google',
    userName: item.authorAttribution?.displayName || 'Google kullanıcısı',
    rating: toSafeRating(item.rating),
    comment: comment.trim(),
    date: item.relativePublishTimeDescription || item.publishTime || '',
  };
}

async function readCache() {
  const record = await prisma.systemSetting.findUnique({ where: { key: CACHE_KEY } }).catch(() => null);
  if (!record) return null;

  try {
    const parsed = JSON.parse(record.value) as { expiresAt: number; summary: ReviewSummary };
    if (parsed.expiresAt > Date.now() && parsed.summary) return parsed.summary;
  } catch {
    return null;
  }

  return null;
}

async function writeCache(summary: ReviewSummary) {
  await prisma.systemSetting.upsert({
    where: { key: CACHE_KEY },
    create: {
      key: CACHE_KEY,
      value: JSON.stringify({ expiresAt: Date.now() + cacheTtlMs(), summary }),
    },
    update: {
      value: JSON.stringify({ expiresAt: Date.now() + cacheTtlMs(), summary }),
    },
  }).catch(() => undefined);
}

export async function getGoogleReviewSummary(): Promise<ReviewSummary> {
  if (!envEnabled()) return dummyReviewSummary();

  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  const placeId = process.env.GOOGLE_PLACE_ID?.trim();
  if (!apiKey || !placeId) return dummyReviewSummary();

  const cached = await readCache();
  if (cached) return cached;

  try {
    const languageCode = process.env.GOOGLE_REVIEWS_LANGUAGE?.trim() || 'tr';
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=${encodeURIComponent(languageCode)}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'rating,userRatingCount,reviews',
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) throw new Error(`Google Places failed: ${response.status}`);
    const payload = await response.json() as {
      rating?: number;
      userRatingCount?: number;
      reviews?: Array<Parameters<typeof normalizeGoogleReview>[0]>;
    };

    const summary: ReviewSummary = {
      source: 'google',
      enabled: true,
      rating: toSafeRating(payload.rating) || dummyReviewSummary().rating,
      count: Number.isFinite(Number(payload.userRatingCount)) ? Number(payload.userRatingCount) : 0,
      labelTr: 'Google değerlendirmeleri',
      labelEn: 'Google reviews',
      reviews: (payload.reviews ?? [])
        .map((item, index) => normalizeGoogleReview(item, index))
        .filter((item): item is PublicReviewItem => Boolean(item))
        .slice(0, 5),
    };

    await writeCache(summary);
    return summary;
  } catch (error) {
    console.error('Google reviews fetch failed.', error);
    return dummyReviewSummary();
  }
}
