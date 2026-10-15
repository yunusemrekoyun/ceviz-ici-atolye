"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  BadgePercent,
  Banknote,
  Bell,
  CalendarClock,
  CalendarRange,
  ChevronDown,
  CircleHelp,
  ChartColumn,
  ClipboardCheck,
  Contact,
  FileText,
  House,
  IdCard,
  Inbox,
  Layers,
  ListChecks,
  LogOut,
  Megaphone,
  Menu as MenuIcon,
  PhoneCall,
  Plus,
  QrCode,
  Settings,
  Shield,
  Shirt,
  TrendingUp,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import { GlobalSearch, type SearchPage } from "@/components/admin/GlobalSearch";
import { Count } from "@/components/admin/kit";
import { ToastProvider } from "@/components/admin/Toast";

type Tier = "main" | "kayit" | "antrenman" | "diger";

type NavItem = {
  href: string;
  label: string;
  short: string;
  icon: ReactNode;
  tier: Tier;
  perm?: string;
  badge?: number;
  badgeTone?: "warn" | "alert";
  /** Bu bölümün alt sayfaları da etkin sayılır (ör. Adaylar: başvurular, randevular, aramalar). */
  also?: string[];
};

const TIER_LABELS: Record<Tier, string> = { main: "", kayit: "Kayıt", antrenman: "Antrenman", diger: "Diğer" };

export type PanelCounts = { pending: number; overdue: number; callbacks: number; claims: number; locked: number; notifications: number; issues: number };
type Props = { username: string; permissions: string[]; counts: PanelCounts; children: ReactNode };

const ic = "h-[18px] w-[18px] shrink-0";

export function AdminShell({ username, permissions, counts, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // Uygulamaya geri dönüldüğünde (telefonda başka uygulamadan dönünce) veriler tazelenir.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [router]);

  // Sıra günlük işe göre: önce her gün kullanılanlar, sonra kayıt süreci, antrenman; yönetim "Diğer"de katlı.
  const all: NavItem[] = [
    { href: "/admin", label: "Bugün", short: "Bugün", icon: <House className={ic} />, tier: "main" },
    { href: "/admin/aidat", label: "Aidat", short: "Aidat", icon: <Wallet className={ic} />, tier: "main", perm: "aidat.gor", badge: counts.claims + counts.locked, badgeTone: counts.claims ? "alert" : "warn" },
    { href: "/admin/ogrenciler", label: "Öğrenciler", short: "Öğrenciler", icon: <Users className={ic} />, tier: "main", perm: "kayit.gor" },
    { href: "/admin/kasa", label: "Kasa", short: "Kasa", icon: <Banknote className={ic} />, tier: "main", perm: "aidat.gor" },
    { href: "/admin/malzeme", label: "Forma ve Malzeme", short: "Forma", icon: <Shirt className={ic} />, tier: "main", perm: "aidat.gor" },
    { href: "/admin/yoklama", label: "Yoklama", short: "Yoklama", icon: <ClipboardCheck className={ic} />, tier: "main", perm: "yoklama.al" },
    { href: "/admin/raporlar", label: "Raporlar", short: "Raporlar", icon: <ChartColumn className={ic} />, tier: "main", perm: "rapor.gor" },
    { href: "/admin/yardim", label: "Nasıl yapılır?", short: "Nasıl yapılır?", icon: <CircleHelp className={ic} />, tier: "main" },
    { href: "/admin/on-kayitlar", label: "Başvurular", short: "Başvurular", icon: <Inbox className={ic} />, tier: "kayit", perm: "kayit.gor", badge: counts.pending, badgeTone: "warn" },
    { href: "/admin/randevular", label: "Randevular", short: "Randevular", icon: <CalendarClock className={ic} />, tier: "kayit", perm: "kayit.gor", badge: counts.overdue, badgeTone: "alert" },
    { href: "/admin/arama-talepleri", label: "Arama Talepleri", short: "Aramalar", icon: <PhoneCall className={ic} />, tier: "kayit", perm: "kayit.gor", badge: counts.callbacks, badgeTone: "alert" },
    { href: "/admin/kontrol", label: "Veri Kontrolü", short: "Kontrol", icon: <ListChecks className={ic} />, tier: "kayit", perm: "kayit.gor", badge: counts.issues, badgeTone: "warn" },
    { href: "/admin/program", label: "Program ve Sahalar", short: "Program", icon: <CalendarRange className={ic} />, tier: "antrenman", perm: "program.yonet" },
    { href: "/admin/gruplar", label: "Gruplar", short: "Gruplar", icon: <Layers className={ic} />, tier: "antrenman", perm: "program.yonet" },
    { href: "/admin/gelisim", label: "Gelişim", short: "Gelişim", icon: <TrendingUp className={ic} />, tier: "antrenman", perm: "gelisim.gir" },
    { href: "/admin/kartlar", label: "Öğrenci Kartları", short: "Kartlar", icon: <IdCard className={ic} />, tier: "antrenman", perm: "kayit.duzenle" },
    { href: "/admin/indirimler", label: "İndirimler", short: "İndirimler", icon: <BadgePercent className={ic} />, tier: "diger", perm: "aidat.gor" },
    { href: "/admin/duyurular", label: "Duyurular", short: "Duyurular", icon: <Megaphone className={ic} />, tier: "diger", perm: "duyuru.yap" },
    { href: "/admin/veliler", label: "Veli Hesapları", short: "Veliler", icon: <Contact className={ic} />, tier: "diger", perm: "veli.yonet" },
    { href: "/admin/ekip", label: "Ekip ve Roller", short: "Ekip", icon: <UsersRound className={ic} />, tier: "diger", perm: "ekip.yonet" },
    { href: "/admin/hocalar", label: "Hoca Tanıtımları", short: "Hocalar", icon: <UsersRound className={ic} />, tier: "diger", perm: "ekip.yonet" },
    { href: "/admin/metinler", label: "Metinler", short: "Metinler", icon: <FileText className={ic} />, tier: "diger", perm: "metin.yonet" },
    { href: "/admin/ayarlar", label: "Ayarlar", short: "Ayarlar", icon: <Settings className={ic} />, tier: "diger", perm: "ayar.yonet" },
    { href: "/admin/guvenlik", label: "Güvenlik", short: "Güvenlik", icon: <Shield className={ic} />, tier: "diger" },
  ];
  const nav = all.filter((i) => !i.perm || permissions.includes(i.perm));
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  const byHref = new Map(nav.map((i) => [i.href, i]));

  // Telefon alt menüsü: Bugün · Aidat · Öğrenciler · Adaylar (başvuru + randevu + arama) · Menü
  const candidates = ["/admin/on-kayitlar", "/admin/randevular", "/admin/arama-talepleri"].map((h) => byHref.get(h)).filter((i): i is NavItem => Boolean(i));
  const candidateAlert = counts.overdue + counts.callbacks;
  const adaylar: NavItem | null = candidates.length
    ? { href: candidates[0]!.href, label: "Adaylar", short: "Adaylar", icon: <Inbox className={ic} />, tier: "kayit", badge: counts.pending + candidateAlert, badgeTone: candidateAlert ? "alert" : "warn", also: candidates.map((c) => c.href) }
    : null;
  const mobileMain = [byHref.get("/admin"), byHref.get("/admin/aidat"), byHref.get("/admin/ogrenciler"), adaylar].filter((i): i is NavItem => Boolean(i));
  const mobileHrefs = new Set(mobileMain.flatMap((i) => [i.href, ...(i.also ?? [])]));
  const mobileMore = nav.filter((i) => !mobileHrefs.has(i.href));
  const activeIn = (i: NavItem) => isActive(i.href) || (i.also ?? []).some(isActive);
  const moreBadge = mobileMore.filter((i) => i.tier !== "diger").reduce((n, i) => n + (i.badge ?? 0), 0);
  const moreActive = mobileMore.some((i) => isActive(i.href));
  const canCreate = permissions.includes("kayit.duzenle");
  const searchPages: SearchPage[] = [
    ...(canCreate ? [{ href: "/admin/kayit/yeni", label: "Yeni kayıt ekle", icon: <Plus /> }] : []),
    ...nav.map((i) => ({ href: i.href, label: i.label, icon: i.icon })),
    { href: "/admin/bildirimler", label: "Bildirimler", icon: <Bell /> },
    ...(permissions.includes("aidat.al") ? [{ href: "/admin/aidat/hak", label: "Hak girişi (kalan antrenmanlar)", icon: <ListChecks /> }] : []),
    ...(canCreate ? [{ href: "/admin/kartlar/foto", label: "Fotoğraf çekimi", icon: <IdCard /> }] : []),
  ];

  return (
    <ToastProvider>
      <a href="#icerik" className="sr-only z-[90] rounded-xl bg-ink px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        İçeriğe geç
      </a>
      <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
        {/* Masaüstü kenar menü: günlük işler üstte, yönetim "Diğer"de katlı */}
        <aside className="no-print sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-[#17110f] text-[#c4bbb4] lg:flex">
          <Link href="/admin" className="flex items-center gap-3 px-5 pb-4 pt-5">
            <BrandMark />
            <span className="leading-tight">
              <span className="block text-xs font-medium text-gs-yellow">Kütahya Galatasaray</span>
              <span className="block text-[15px] font-bold text-white">Futbol Okulları</span>
            </span>
          </Link>
          <nav className="panel-scroll flex-1 overflow-y-auto px-3 pb-3" aria-label="Panel menüsü">
            {(["main", "kayit", "antrenman"] as const).map((tier) => {
              const items = nav.filter((i) => i.tier === tier);
              if (!items.length) return null;
              return (
                <div key={tier} className="mt-4 first:mt-1">
                  {TIER_LABELS[tier] ? <p className="px-3 pb-1 text-xs font-semibold text-white/50">{TIER_LABELS[tier]}</p> : null}
                  <div className="space-y-px">
                    {items.map((item) => (
                      <SideLink key={item.href} item={item} on={isActive(item.href)} />
                    ))}
                  </div>
                </div>
              );
            })}
            <SideMore items={nav.filter((i) => i.tier === "diger")} isActive={isActive} />
          </nav>
          <div className="border-t border-white/[0.08] p-3">
            <a href="/admin/qr-afis" target="_blank" rel="noopener" className="flex min-h-9 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition hover:bg-white/[0.05] hover:text-white">
              <QrCode className={`${ic} text-white/55`} /> QR afişi
            </a>
            <form action={logoutAction} className="mt-2 flex items-center gap-2.5 rounded-xl bg-white/[0.05] py-1.5 pl-2 pr-1.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white" aria-hidden="true">
                {username.trim().slice(0, 1).toLocaleUpperCase("tr-TR")}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-white/80">{username}</span>
              <button type="submit" title="Çıkış yap" aria-label="Çıkış yap" className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white">
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Üst çubuk: telefonda koyu marka şeridi, masaüstünde arama + hızlı eylemler */}
          <header className="no-print sticky top-0 z-40 flex items-center gap-1 bg-[#17110f] px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-white lg:h-16 lg:gap-2 lg:border-b lg:border-line lg:bg-surface/95 lg:px-8 lg:py-0 lg:text-ink lg:backdrop-blur-sm">
            <Link href="/admin" className="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 pl-1 lg:hidden">
              <BrandMark small />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-xs font-medium text-gs-yellow">Kütahya Galatasaray</span>
                <span className="block truncate text-[15px] font-bold">Futbol Okulları</span>
              </span>
            </Link>
            <GlobalSearch pages={searchPages} enabled={permissions.includes("kayit.gor")} />
            <div className="hidden flex-1 lg:block" />
            {canCreate ? (
              <Link href="/admin/kayit/yeni" className="hidden min-h-10 items-center gap-1.5 rounded-xl bg-gs-red px-4 text-[15px] font-semibold text-white transition hover:bg-gs-red-dark active:scale-[0.97] lg:inline-flex">
                <Plus className="h-4 w-4" aria-hidden="true" /> Yeni kayıt
              </Link>
            ) : null}
            <Link
              href="/admin/bildirimler"
              aria-label={counts.notifications ? `Bildirimler (${counts.notifications} okunmamış)` : "Bildirimler"}
              className={[
                "relative flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95 lg:h-10 lg:w-10 lg:rounded-xl lg:border lg:border-line lg:bg-white",
                pathname.startsWith("/admin/bildirimler") ? "text-gs-yellow lg:text-gs-red" : "text-white/85 hover:bg-white/10 lg:text-ink lg:hover:bg-surface",
              ].join(" ")}
            >
              <Bell className="h-[22px] w-[22px] lg:h-[18px] lg:w-[18px]" aria-hidden="true" />
              {counts.notifications ? <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-4 text-white ring-2 ring-[#17110f] lg:-right-1 lg:-top-1 lg:ring-surface">{counts.notifications}</span> : null}
            </Link>
          </header>

          <div id="icerik" tabIndex={-1} className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] outline-none lg:pb-0">
            {children}
          </div>
        </div>

        {/* Mobil alt menü: başparmakla ulaşılır, simge + yazı */}
        <nav className="no-print fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Panel menüsü">
          {mobileMain.map((item) => {
            const on = activeIn(item);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={["relative flex min-h-[3.75rem] flex-col items-center justify-center gap-1 text-xs font-semibold transition active:scale-95 [&_svg]:h-[22px] [&_svg]:w-[22px]", on ? "text-gs-red" : "text-stone-500"].join(" ")}
              >
                {on ? <span className="absolute inset-x-5 top-0 h-[3px] rounded-b-full bg-gs-red" aria-hidden="true" /> : null}
                <span className="relative">
                  {item.icon}
                  {item.badge ? <Count value={item.badge} tone={item.badgeTone === "alert" ? "alert" : "warn"} className="absolute -right-3 -top-2 ring-2 ring-white" /> : null}
                </span>
                {item.short}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            className={["flex min-h-[3.75rem] cursor-pointer flex-col items-center justify-center gap-1 text-xs font-semibold transition active:scale-95", moreActive ? "text-gs-red" : "text-stone-500"].join(" ")}
          >
            <span className="relative">
              <MenuIcon className="h-[22px] w-[22px]" aria-hidden="true" />
              {moreBadge ? <Count value={moreBadge} tone="warn" className="absolute -right-3 -top-2 ring-2 ring-white" /> : null}
            </span>
            Menü
          </button>
        </nav>

        {menuOpen ? <MobileMenu items={mobileMore} username={username} canCreate={canCreate} isActive={isActive} onClose={() => setMenuOpen(false)} /> : null}
      </div>
    </ToastProvider>
  );
}

function SideLink({ item, on }: { item: NavItem; on: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={on ? "page" : undefined}
      className={["relative flex min-h-9 items-center gap-3 rounded-lg px-3 text-[14px] font-medium transition duration-150", on ? "bg-white/[0.09] text-white" : "hover:bg-white/[0.05] hover:text-white"].join(" ")}
    >
      {on ? <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-gs-yellow" aria-hidden="true" /> : null}
      <span className={on ? "text-gs-yellow" : "text-white/55"}>{item.icon}</span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge ? <Count value={item.badge} tone={item.badgeTone === "alert" ? "alert" : "warn"} /> : null}
    </Link>
  );
}

/** "Diğer": seyrek kullanılan yönetim sayfaları; içindeki bir sayfadaysa açık gelir, tercih hatırlanır. */
function SideMore({ items, isActive }: { items: NavItem[]; isActive: (href: string) => boolean }) {
  const inside = items.some((i) => isActive(i.href));
  const stored = useSyncExternalStore(noopSubscribe, readMoreOpen, () => false);
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = inside || (toggled ?? stored);
  if (!items.length) return null;
  const toggle = () => {
    const next = !open;
    try {
      localStorage.setItem("panel-nav-more", next ? "1" : "0");
    } catch {}
    setToggled(next);
  };
  return (
    <div className="mt-4">
      <button type="button" onClick={toggle} aria-expanded={open} className="flex min-h-8 w-full cursor-pointer items-center justify-between rounded-lg px-3 text-xs font-semibold text-white/50 transition hover:text-white/80">
        Diğer
        <ChevronDown className={["h-4 w-4 transition-transform duration-200", open ? "rotate-180" : ""].join(" ")} aria-hidden="true" />
      </button>
      {open ? (
        <div className="space-y-px">
          {items.map((item) => (
            <SideLink key={item.href} item={item} on={isActive(item.href)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const noopSubscribe = () => () => {};
function readMoreOpen(): boolean {
  try {
    return localStorage.getItem("panel-nav-more") === "1";
  } catch {
    return false;
  }
}

/** Telefonda "Menü": günlük işler üstte büyük karolar, yönetim sayfaları katlı "Diğer" altında. */
function MobileMenu({ items, username, canCreate, isActive, onClose }: { items: NavItem[]; username: string; canCreate: boolean; isActive: (href: string) => boolean; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  const daily = items.filter((i) => i.tier !== "diger");
  const other = items.filter((i) => i.tier === "diger");
  const tile = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      onClick={onClose}
      aria-current={isActive(item.href) ? "page" : undefined}
      className={[
        "flex min-h-14 items-center gap-2.5 rounded-xl border px-3 text-[15px] font-semibold transition active:scale-[0.98] [&_svg]:h-5 [&_svg]:w-5",
        isActive(item.href) ? "border-gs-red/30 bg-gs-red-soft text-gs-red" : "border-line text-ink",
      ].join(" ")}
    >
      <span className={isActive(item.href) ? "" : "text-muted"}>{item.icon}</span>
      <span className="min-w-0 flex-1 leading-tight">{item.short}</span>
      {item.badge ? <Count value={item.badge} tone={item.badgeTone === "alert" ? "alert" : "warn"} /> : null}
    </Link>
  );
  return (
    <div className="scrim-in fixed inset-0 z-[60] flex items-end bg-black/50 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet-in max-h-[88dvh] w-full overflow-y-auto rounded-t-[20px] bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3" role="dialog" aria-modal="true" aria-label="Menü">
        <div className="mb-3 flex items-center justify-between">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-stone-300" aria-hidden="true" />
        </div>
        {canCreate ? (
          <Link href="/admin/kayit/yeni" onClick={onClose} className="mb-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gs-red font-semibold text-white active:scale-[0.98]">
            <Plus className="h-5 w-5" aria-hidden="true" /> Yeni kayıt
          </Link>
        ) : null}
        <div className="grid grid-cols-2 gap-2">{daily.map(tile)}</div>
        {other.length ? (
          <details className="group mt-4 rounded-xl border border-line" open={other.some((i) => isActive(i.href))}>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-3 text-[15px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
              Diğer
              <ChevronDown className="h-5 w-5 text-muted transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="grid grid-cols-2 gap-2 border-t border-line p-2">{other.map(tile)}</div>
          </details>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3">
          <a href="/admin/qr-afis" target="_blank" rel="noopener" className="flex min-h-12 items-center gap-2.5 rounded-xl px-3 text-[15px] font-semibold text-ink active:bg-surface">
            <QrCode className="h-5 w-5 text-muted" aria-hidden="true" /> QR afişi
          </a>
          <form action={logoutAction}>
            <button type="submit" className="flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left text-[15px] font-semibold text-red-700 active:bg-red-50">
              <LogOut className="h-5 w-5" aria-hidden="true" />
              <span className="min-w-0">
                Çıkış
                <span className="block truncate text-xs font-normal text-muted">{username}</span>
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/** Marka işareti: kulübün iki rengi, resmî arma yerine sade bir işaret. */
function BrandMark({ small }: { small?: boolean }) {
  return (
    <span className={["relative flex shrink-0 overflow-hidden rounded-[10px] ring-1 ring-white/10", small ? "h-7 w-7" : "h-9 w-9"].join(" ")} aria-hidden="true">
      <span className="h-full w-1/2 bg-gs-yellow" />
      <span className="h-full w-1/2 bg-gs-red" />
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold tracking-tight text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]">{small ? "" : "GS"}</span>
    </span>
  );
}
