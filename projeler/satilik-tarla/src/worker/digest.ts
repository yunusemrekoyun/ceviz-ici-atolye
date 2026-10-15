// Kayıtlı arama günlük özeti — her sabah 08:00 (Europe/Istanbul) tetiklenir;
// yalnızca son bildirimden SONRA yayınlanan eşleşme varsa e-posta + zil gider.
import type { PrismaClient } from '@prisma/client';
import { emailQueue } from '../lib/queue';
import { buildWhere, parseSearchParams } from '../lib/search-core';
import { paramsToChips } from '../lib/search-params-label';

const SITE_URL = process.env.SITE_URL ?? process.env.BETTER_AUTH_URL ?? '';

export async function runSavedSearchDigest(prisma: PrismaClient) {
  const searches = await prisma.savedSearch.findMany({
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  let sent = 0;
  for (const search of searches) {
    try {
      const params = search.params as Record<string, string>;
      const filters = parseSearchParams(params);
      const matches = await prisma.listing.findMany({
        where: {
          AND: [buildWhere(filters), { publishedAt: { gt: search.lastNotifiedAt } }],
        },
        orderBy: { publishedAt: 'desc' },
        take: 10,
        select: { title: true, price: true, slug: true },
      });
      if (matches.length === 0) continue;

      const chips = paramsToChips(params).join(' · ') || 'Kayıtlı aramanız';
      const lines = matches
        .map((m) => `• ${m.title} — ${m.price}\n  ${SITE_URL}/ilan/${m.slug}`)
        .join('\n');

      await emailQueue.add('notify', {
        kind: 'notify',
        to: search.user.email,
        subject: `${matches.length} yeni ilan — ${search.name}`,
        heading: 'Aramanıza uyan yeni ilanlar var',
        body: `${chips} aramanıza uyan ${matches.length} yeni ilan yayınlandı:\n\n${lines}`,
        ctaUrl: `${SITE_URL}/ilanlar?${new URLSearchParams(params).toString()}`,
        ctaLabel: 'Tümünü Görüntüle',
      });
      await prisma.notification.create({
        data: {
          userId: search.user.id,
          title: `${matches.length} yeni ilan — ${search.name}`,
          body:
            matches[0].title + (matches.length > 1 ? ` ve ${matches.length - 1} ilan daha` : ''),
          href: `/ilanlar?${new URLSearchParams(params).toString()}`,
        },
      });
      await prisma.savedSearch.update({
        where: { id: search.id },
        data: { lastNotifiedAt: new Date() },
      });
      sent += 1;
    } catch (err) {
      // Tek aramanın hatası diğerlerini durdurmasın
      console.error(`[worker] özet: arama ${search.id} işlenemedi:`, err);
    }
  }
  return { searches: searches.length, sent };
}
