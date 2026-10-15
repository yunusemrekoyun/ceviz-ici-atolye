import { requirePortal } from "@/lib/auth/server";
import { getSetting } from "@/lib/settings";
import { PortalShell, type PortalNavItem } from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePortal("coach");
  const nav: PortalNavItem[] = [
    { href: "/antrenor", label: "Bugün", icon: "home" },
    // Kartla yoklama ayarı kapalıyken (kartlar basılana kadar) menüde yok
    ...(user.permissions.includes("yoklama.al") && getSetting("cardAttendance") ? [{ href: "/antrenor/tara", label: "Kart okut", icon: "scan" as const }] : []),
    { href: "/antrenor/ogrenciler", label: "Öğrenciler", icon: "users" },
    ...(user.permissions.includes("gelisim.gir") ? [{ href: "/antrenor/gelisim", label: "Gelişim", icon: "chart" as const }] : []),
  ];
  return (
    <PortalShell title="Antrenör" userName={user.fullName ?? user.username ?? "Antrenör"} nav={nav}>
      {children}
    </PortalShell>
  );
}
