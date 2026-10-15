"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { portalLogoutAction } from "@/app/giris/actions";
import { ToastProvider } from "@/components/admin/Toast";

export type PortalNavItem = { href: string; label: string; icon: keyof typeof PortalIcons; badge?: number };

/** Antrenör ve veli panellerinin ortak kabuğu: üstte ad, altta büyük dokunmatik menü. */
const TEXT_KEY = "gs-yazi-boyutu";

/** Büyük yazı tercihi cihazda saklanır; tüm arayüz (rem) birlikte büyür. */
export function TextSizeToggle({ className }: { className?: string } = {}) {
  const [large, setLarge] = useState(false);
  useEffect(() => {
    let stored = false;
    try {
      stored = localStorage.getItem(TEXT_KEY) === "buyuk";
    } catch {
      // depolama kapalıysa varsayılan boyut
    }
    document.documentElement.style.fontSize = stored ? "115%" : "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- yalnız ilk açılışta cihaz tercihini okur
    setLarge(stored);
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, []);
  const toggle = () => {
    const next = !large;
    setLarge(next);
    document.documentElement.style.fontSize = next ? "115%" : "";
    try {
      localStorage.setItem(TEXT_KEY, next ? "buyuk" : "normal");
    } catch {
      // yok say
    }
  };
  return (
    <button type="button" onClick={toggle} aria-pressed={large} aria-label="Yazı boyutu" className={className ?? "min-h-11 cursor-pointer rounded-xl px-3 text-sm font-bold text-zinc-300 transition hover:bg-white/10 hover:text-white"}>
      {large ? "A−" : "A+"}
    </button>
  );
}

export function PortalShell({
  title,
  userName,
  nav,
  children,
  large = false,
  textToggle = false,
  bell,
  carryParam,
}: {
  title: string;
  userName: string;
  nav: PortalNavItem[];
  children: ReactNode;
  large?: boolean;
  textToggle?: boolean;
  /** Üst çubukta zil (duyurular) ve okunmamış sayısı. */
  bell?: { href: string; count: number; label: string };
  /** Menü bağlantılarında korunacak adres parametresi (veli: seçili çocuk "ogrenci"). */
  carryParam?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();
  const carried = carryParam ? search.get(carryParam) : null;
  const withParam = (href: string) => (carried && carryParam ? `${href}${href.includes("?") ? "&" : "?"}${carryParam}=${encodeURIComponent(carried)}` : href);
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);
  const home = nav[0]?.href ?? "/";
  const isActive = (href: string) => (href === home ? pathname === home : pathname.startsWith(href));
  return (
    <ToastProvider>
      <div className={["flex min-h-dvh flex-1 flex-col bg-surface", large ? "text-[18px]" : ""].join(" ")}>
        <header className="no-print sticky top-0 z-40 flex items-center justify-between gap-3 bg-[#101114] px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gs-yellow">{title}</p>
            <p className="truncate text-[15px] font-bold">{userName}</p>
          </div>
          <div className="flex items-center gap-1">
          {bell ? (
            <Link href={bell.href} aria-label={bell.count ? `${bell.label}, ${bell.count} okunmamış` : bell.label} className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-zinc-200 transition hover:bg-white/10 hover:text-white">
              {PortalIcons.bell}
              {bell.count ? <span className="absolute right-1 top-1 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-5 text-white">{bell.count > 9 ? "9+" : bell.count}</span> : null}
            </Link>
          ) : null}
          {textToggle ? <TextSizeToggle /> : null}
          <form action={portalLogoutAction}>
            <button type="submit" className="min-h-11 cursor-pointer rounded-xl px-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-white">
              Çıkış
            </button>
          </form>
          </div>
        </header>
        <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4">{children}</div>
        <nav
          className="no-print fixed inset-x-0 bottom-0 z-50 grid border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
          style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
          aria-label="Menü"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={withParam(item.href)}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={["relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-[12px] font-semibold transition active:scale-95", isActive(item.href) ? "text-gs-red" : "text-muted"].join(" ")}
            >
              {isActive(item.href) ? <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-gs-red" aria-hidden="true" /> : null}
              <span className="relative">
                {PortalIcons[item.icon]}
                {item.badge ? <span className="absolute -right-2.5 -top-1.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-5 text-white">{item.badge > 9 ? "9+" : item.badge}</span> : null}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </ToastProvider>
  );
}

const svg = (d: ReactNode) => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const PortalIcons = {
  home: svg(<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />),
  scan: svg(
    <>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <path d="M7 12h10" />
    </>,
  ),
  users: svg(
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </>,
  ),
  calendar: svg(
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>,
  ),
  wallet: svg(
    <>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 10h18M16 15h2" />
    </>,
  ),
  chart: svg(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />),
  user: svg(
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>,
  ),
  bell: svg(
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>,
  ),
};
