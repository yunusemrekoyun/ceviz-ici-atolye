import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Playfair_Display, Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { ThemeProvider } from '@/theme/ThemeContext';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { prisma } from '@/lib/prisma';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

// Hotel mobile design system fonts (design-refs/refs.pdf): Playfair (serif
// headings) + Inter (sans body). Used only by the mobile shell; desktop keeps
// Space Grotesk.
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Kütahya Garden Otel',
  description: 'Kütahya Garden Otel — Rezervasyon ve otel yönetim sistemi.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Allow the layout to extend under the notch / home indicator; pair with
  // the safe-area helpers in globals.css for fixed bars.
  viewportFit: 'cover',
  themeColor: '#07100f',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  let initialTheme = 'sunset';
  try {
    const themeSetting = await prisma.systemSetting.findUnique({ where: { key: 'theme' } });
    if (themeSetting?.value) {
      initialTheme = themeSetting.value;
    }
  } catch (error) {
    console.error('Error fetching theme from DB:', error);
  }

  return (
    // Font variables must live on <html>: Tailwind v4 @theme tokens
    // (--font-serif/--font-hotel) resolve their var() references at :root.
    <html
      lang="en"
      data-theme={initialTheme}
      className={`${spaceGrotesk.variable} ${playfair.variable} ${inter.variable}`}
    >
      <body>
        <ThemeProvider initialTheme={initialTheme as any}>
          <LanguageProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
