import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Bricolage_Grotesque, Hanken_Grotesk } from 'next/font/google';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { Providers } from './providers';

const display = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Hanken_Grotesk({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  // SITE_URL bilinçli olarak NEXT_PUBLIC'siz: yalnız server'da okunur, runtime
  // env'i olarak verilebilir — build'e gömülmez (DB'siz/env'siz VPS build kısıtı).
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Kütahya Satılık Tarla — Arazi, Tarla ve Arsa İlanları',
    template: '%s — Kütahya Satılık Tarla',
  },
  description:
    'Kütahya ve ilçelerinde satılık tarla, arsa ve arazi ilanları. Gerçek fotoğraflar, net tapu bilgisi ve kolay iletişim.',
  openGraph: {
    siteName: 'Kütahya Satılık Tarla',
    locale: 'tr_TR',
    type: 'website',
  },
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KS Tarla',
  },
};

export const viewport: Viewport = {
  themeColor: '#163a2c' /* derin çam yeşili — marka rengi */,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr" className={`${display.variable} ${sans.variable}`}>
      <head>
        {/* JS kapalıysa scroll-reveal içerikleri gizli kalmasın */}
        <noscript>
          <style>{`.reveal{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
