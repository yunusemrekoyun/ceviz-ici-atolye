// Cache tag sözleşmesi — veri katmanı (data.ts) bu tag'lerle cache'ler,
// admin server action'ları mutasyon sonrası aynı tag'leri revalidate eder.
export const TAGS = {
  siteContent: 'site-content',
  listings: 'listings',
  listing: (slug: string) => `listing:${slug}`,
  articles: 'articles',
} as const;
