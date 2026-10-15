"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { portalLogoutAction } from "@/app/giris/actions";
import { ToastProvider } from "@/components/admin/Toast";
import { TextSizeToggle } from "@/components/portal/PortalShell";

/**
 * Veli panelinin kabuğu: ana sayfadaki gibi beyaz üst çubuk (arma, okul adı), altta üç büyük sekme.
 * Seçili çocuk (?ogrenci=) sekmeler arasında korunur.
 */
const NAV = [
  { href: "/veli", label: "Profil", icon: "user" },
  { href: "/veli/antrenmanlar", label: "Antrenmanlar", icon: "calendar" },
  { href: "/veli/kart", label: "Dijital kart", icon: "qr" },
] as const;

export function GuardianShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const child = search.get("ogrenci");
  const withChild = (href: string) => (child ? `${href}?ogrenci=${encodeURIComponent(child)}` : href);
  // Başka uygulamadan dönünce güncel bilgi
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);
  const active = (href: string) => (href === "/veli" ? pathname === "/veli" || pathname === "/veli/bilgiler" : pathname.startsWith(href));
  return (
    <ToastProvider>
      <div className="veli">
        <a href="#veli-icerik" className="veli-skip">İçeriğe geç</a>
        <div className="veli-frame">
          <header className="veli-header no-print">
            <div className="veli-header-inner">
              <Link href={withChild("/veli")} className="veli-brand" aria-label="Kütahya Galatasaray Futbol Okulu, veli profili">
                <Image src="/home/crest.webp" alt="" width={44} height={44} />
                <span>
                  <strong>KÜTAHYA GALATASARAY</strong>
                  <small>Futbol Okulu <span>· Veli paneli</span></small>
                </span>
              </Link>
              <div className="veli-header-actions">
                <TextSizeToggle className="veli-text-toggle" />
                <form action={portalLogoutAction}>
                  <button type="submit" className="veli-logout">
                    Çıkış
                  </button>
                </form>
              </div>
            </div>
          </header>
          <nav className="veli-nav no-print" aria-label="Veli paneli">
            <div className="veli-nav-inner">
              {NAV.map((item) => {
                const on = active(item.href);
                return (
                  <Link
                    key={item.href}
                    href={withChild(item.href)}
                    aria-current={on ? "page" : undefined}
                    className="veli-nav-link"
                  >
                    {ICONS[item.icon]}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
          <main id="veli-icerik" className="veli-main" tabIndex={-1}>{children}</main>
          <footer className="veli-footer no-print"><span>Kütahya Galatasaray Futbol Okulu</span><span>Birlikte, sahada.</span></footer>
          <div className="veli-frame-stripe" aria-hidden="true" />
        </div>
      </div>
    </ToastProvider>
  );
}

const svg = (d: ReactNode) => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const ICONS = {
  user: svg(
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>,
  ),
  calendar: svg(
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18M8.5 15l2.2 2.2 4.8-4.7" />
    </>,
  ),
  qr: svg(
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
    </>,
  ),
};
