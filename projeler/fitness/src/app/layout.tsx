import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { Wrench } from "lucide-react";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";
import { Toaster } from "@/components/ui/Toaster";
import { NavigationProgress } from "@/components/NavigationProgress";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { getSystemSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Baha Fitness — Premium Spor Kulübü",
    template: "%s · Baha Fitness",
  },
  description:
    "İstanbul'un kalbinde premium fitness deneyimi. Modern ekipmanlar, uzman antrenörler, kişiye özel programlar.",
  keywords: ["fitness", "spor salonu", "kişisel antrenör", "premium gym", "fitness merkezi"],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    title: "Baha Fitness — Premium Spor Kulübü",
    description: "Premium fitness deneyimi.",
    type: "website",
    locale: "tr_TR",
  },
  robots: { index: true, follow: true },
};

function MaintenanceScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="w-20 h-20 rounded-2xl bg-neon/10 border border-neon/20 grid place-items-center mb-6">
        <Wrench className="w-10 h-10 text-neon" />
      </div>
      <h1 className="h-display text-3xl">Kısa bir bakımdayız</h1>
      <p className="mt-3 text-body max-w-md">
        Sistemi daha iyi hale getirmek için kısa bir bakım yapıyoruz.
        Kısa süre içinde tekrar hizmetteyiz — birazdan tekrar dener misin?
      </p>
    </div>
  );
}

/**
 * Bakım modu burada uygulanıyor, middleware'de değil: middleware edge
 * runtime'da çalışıyor ve Prisma orada çalışmadığı için ayarı okuyamıyoruz.
 *
 * Bakım kapalıyken cookie okunmaz — böylece statik render edilebilen
 * sayfalar (blog, kurumsal sayfalar) dinamiğe düşmez.
 */
async function isUnderMaintenance(): Promise<boolean> {
  const settings = await getSystemSettings();
  if (!settings["system.maintenanceMode"]) return false;

  // Çıkış yapmış admin modu kapatabilmek için giriş yapabilmeli.
  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname === "/giris") return false;

  const user = await getCurrentUser();
  return !user || !["ADMIN", "STAFF"].includes(user.role);
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const maintenance = await isUnderMaintenance();

  return (
    <html lang="tr" className={inter.variable}>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider>
          <ToastProvider>
            <NavigationProgress />
            {maintenance ? <MaintenanceScreen /> : children}
            <Toaster />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
