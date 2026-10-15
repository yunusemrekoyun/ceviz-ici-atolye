import type { MetadataRoute } from 'next';
import { getSitemapEntries } from '@/lib/data';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const entries = await getSitemapEntries();

  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/ilanlar`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/harita`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${base}/rehber`, changeFrequency: 'weekly', priority: 0.5 },
    ...entries.map((e) => ({
      url: `${base}/ilan/${e.slug}`,
      lastModified: new Date(e.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
