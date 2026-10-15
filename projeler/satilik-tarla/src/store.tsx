'use client';

// Site geneli içerik ("chrome": marka, hero, bölüm başlıkları, ilçeler,
// özellikler, iletişim, rehber kartları) artık sunucudan gelir:
// (site)/layout.tsx -> getSiteChrome() -> <ContentProvider content={...}>.
// useStore() imzası korunmuştur; tüketici bileşenler değişmeden çalışır.
// İlanlar bu provider'da DEĞİLDİR — sayfalar prop olarak geçirir (payload'ı
// ilan sayısıyla büyütmemek için).
import { createContext, useContext, type ReactNode } from 'react';
import { defaultContent } from './content';
import type { SiteChrome } from './lib/mappers';

type Store = { content: SiteChrome };

const ContentContext = createContext<Store | null>(null);

export function ContentProvider({
  content,
  children,
}: {
  content: SiteChrome;
  children: ReactNode;
}) {
  return <ContentContext.Provider value={{ content }}>{children}</ContentContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(ContentContext);
  if (ctx) return ctx;
  // Provider dışı kullanım (beklenmez) — seed içerikle çalışmaya devam et.
  const { listings: _unused, ...chrome } = defaultContent;
  return { content: chrome };
}

// --- biçimlendirme yardımcıları (geriye uyumlu re-export) ---
export { formatTRY, parsePrice, telLink, waLink } from './lib/format';
