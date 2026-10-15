import type { ReactNode } from 'react';
import { getSiteChrome } from '@/lib/data';
import { ContentProvider } from '@/store';
import { FavoritesProvider } from '@/components/listings/favorites';
import { SiteHeader } from '@/components/site/site-header';
import { SiteFooter } from '@/components/site/site-footer';
import { FloatingWhatsApp } from '@/components/site/floating-whatsapp';
import { MobileActionBar } from '@/components/site/mobile-action-bar';

// Site-genelinde ISR güvenlik ağı: alt ağaçta "en düşük değer kazanır".
// Admin mutasyonları revalidateTag ile anında tazeler; bu değer yalnızca
// tag'e bağlanmamış/fallback'le üretilmiş rotaların üst sınırıdır.
export const revalidate = 300;

// DİKKAT: Bu layout'a headers()/cookies() (ör. oturum okuma) EKLENMEZ —
// bunlar tüm public sayfaları dinamiğe düşürür (binlerce ilan SEO hedefiyle
// çelişir). Async DB okuması (getSiteChrome) ise build/ISR'da çalışır,
// dinamikleştirmez. Oturum durumu SiteHeader'da client-side okunur.
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const chrome = await getSiteChrome();

  return (
    <ContentProvider content={chrome}>
      <FavoritesProvider>
        <SiteHeader />
        {/* Yüzen header sabit konumlu: içerik üstten onun payını alır; ana
          sayfadaki hero bu payı negatif marjla geri alıp tam ekran başlar.
          Mobil alt aksiyon çubuğu için alt boşluk: bar yüksekliği + iPhone
          home-indicator safe-area'sı (yoksa footer'ın altı bar altında kalır). */}
        <div
          id="top"
          className="pb-[calc(var(--action-bar-h)+env(safe-area-inset-bottom))] pt-20 lg:pb-0 lg:pt-24"
        >
          <main>{children}</main>
          <SiteFooter />
        </div>
        <FloatingWhatsApp />
        <MobileActionBar />
      </FavoritesProvider>
    </ContentProvider>
  );
}
