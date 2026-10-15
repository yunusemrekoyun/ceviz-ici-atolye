import type { Metadata, Viewport } from "next";
import { requirePortal } from "@/lib/auth/server";
import { GuardianShell } from "@/components/guardian/GuardianShell";
import "./veli.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { default: "Veli Paneli", template: "%s · Veli Paneli" },
  robots: { index: false, follow: false },
  // Ana ekrana eklenince veli paneli açılır (yönetim paneli değil)
  manifest: "/veli/manifest.webmanifest",
  appleWebApp: { capable: true, title: "KGS Veli", statusBarStyle: "default" },
  icons: { apple: "/veli/ikon/180" },
};
export const viewport: Viewport = { themeColor: "#ffffff" };

export default async function GuardianLayout({ children }: { children: React.ReactNode }) {
  await requirePortal("guardian");
  return <GuardianShell>{children}</GuardianShell>;
}
