import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Galatasaray Kütahya Futbol Okulu – Ön Kayıt",
    template: "%s | GS Kütahya Futbol Okulu",
  },
  description: "Galatasaray Spor Okulları Kütahya Futbol Okulu ön kayıt formu.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#a90432",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
