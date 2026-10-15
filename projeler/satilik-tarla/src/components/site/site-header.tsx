'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LogOut, Menu, Phone, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { NotificationBell } from './notification-bell';
import { LAND_TYPES } from '@/content';
import { useStore, telLink } from '@/store';
import { authClient } from '@/lib/auth-client';

/** Kategori-öncelikli gezinme: tıkla ve doğrudan ilanlara gir. */
const navLinks = [
  { href: '/ilanlar', label: 'Tüm İlanlar', tur: null as string | null },
  ...LAND_TYPES.map((t) => ({
    href: `/ilanlar?tur=${encodeURIComponent(t)}`,
    label: t,
    tur: t as string | null,
  })),
  { href: '/harita', label: 'Harita', tur: null as string | null },
];

/**
 * Masaüstü nav: fareyi takip eden kayan vurgu yastığı + aktif rotada kalıcı
 * pirinç çizgi. Yastık ilk görünüşünde olduğu yerde belirir (snap), sonraki
 * geçişlerde öğeden öğeye akar.
 */
function DesktopNav({
  pathname,
  tur,
  dark,
}: {
  pathname: string;
  tur: string | null;
  dark?: boolean;
}) {
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0, on: false, snap: true });

  const movePill = useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    const nav = navRef.current;
    if (!nav) return;
    const item = e.currentTarget.getBoundingClientRect();
    const box = nav.getBoundingClientRect();
    setPill((p) => ({
      left: item.left - box.left,
      width: item.width,
      on: true,
      snap: !p.on,
    }));
  }, []);

  return (
    <nav
      ref={navRef}
      aria-label="Ana menü"
      onMouseLeave={() => setPill((p) => ({ ...p, on: false }))}
      className="relative hidden items-center lg:flex"
    >
      <span
        aria-hidden="true"
        style={{ transform: `translateX(${pill.left}px)`, width: pill.width }}
        className={cn(
          dark
            ? 'absolute inset-y-1.5 left-0 rounded-sm bg-white/10'
            : 'absolute inset-y-1.5 left-0 rounded-sm bg-secondary',
          pill.snap
            ? 'transition-opacity duration-200'
            : 'transition-[transform,width,opacity] duration-300 ease-out-quart',
          pill.on ? 'opacity-100' : 'opacity-0',
        )}
      />
      {navLinks.map((l) => {
        const active =
          l.href === '/harita'
            ? pathname === '/harita'
            : pathname === '/ilanlar' && (l.tur === null ? !tur : tur === l.tur);
        return (
          <Link
            key={l.href}
            href={l.href}
            onMouseEnter={movePill}
            className={cn(
              'relative z-10 px-3 py-2 text-[15px] font-medium transition-colors duration-200',
              dark
                ? active
                  ? 'text-white'
                  : 'text-white/75 hover:text-white'
                : active
                  ? 'text-foreground'
                  : 'text-foreground/70 hover:text-foreground',
            )}
          >
            {l.label}
            {active ? (
              <span aria-hidden="true" className="absolute inset-x-3 bottom-0.5 h-[2px] bg-brass" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** useSearchParams statik sayfalarda Suspense ister; nav'ı burada sarıyoruz. */
function DesktopNavWithParams({ pathname, dark }: { pathname: string; dark?: boolean }) {
  const tur = useSearchParams().get('tur');
  return <DesktopNav pathname={pathname} tur={tur} dark={dark} />;
}

/**
 * Yüzen ada header: sayfadan kopuk, hairline çerçeveli buzlu-cam plaka.
 * Kayınca sıkışır; aşağı kaydırırken çekilir, yukarı dönünce geri süzülür.
 */
export function SiteHeader() {
  const { content } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const searchBtnRef = useRef<HTMLButtonElement>(null);
  const lastY = useRef(0);
  const phone = content.contact.phone;

  // Bilerek yalnızca client-side okunuyor (bkz. (site)/layout.tsx'teki not) —
  // site-genelinde statik üretimi korumak için kısa bir hydration flicker'ı
  // (misafir -> giriş yapmış) kabul ediliyor.
  const { data: session } = authClient.useSession();
  const user = session?.user ?? null;

  // Koyu sinematik hero'lu rotalarda (ana sayfa, ilan detayı) kaydırma
  // başlamadan header koyu-cam varyantına döner; ivory pill fotoğraf üstünde
  // yapışkan etiket gibi durmasın. Kayınca mevcut ivory hâline geçer.
  const dark = !stuck && (pathname === '/' || pathname.startsWith('/ilan/'));

  function handleSignOut() {
    authClient.signOut({ fetchOptions: { onSuccess: () => router.push('/') } });
  }

  useEffect(() => {
    // İlk konumda "hidden" hesaplama: sayfa kaydırılmış açılırsa (derin
    // bağlantı, yenileme) header görünür başlar; gizlenme yalnızca gerçek
    // kaydırma olaylarıyla tetiklenir.
    lastY.current = window.scrollY;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kaydırılmış açılan sayfada (derin bağlantı) ilk konum senkronu
    setStuck(window.scrollY > 24);
    const onScroll = () => {
      const y = window.scrollY;
      setStuck(y > 24);
      setHidden(y > 420 && y > lastY.current);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (!v) {
      searchRef.current?.focus();
      return;
    }
    router.push(`/ilanlar?q=${encodeURIComponent(v)}`);
    setQ('');
    setSearchOpen(false);
    searchBtnRef.current?.focus();
  }

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => searchRef.current?.focus(), 60);
  }

  function closeSearch() {
    setQ('');
    setSearchOpen(false);
    // Odak kırpılmış input'ta kalmasın; görünür butona dönsün
    searchBtnRef.current?.focus();
  }

  return (
    <header>
      <div
        inert={hidden}
        className={cn(
          // z-40: modal/sheet/dialog (z-50) her zaman kabuğun üstünde kalır
          'pointer-events-none fixed inset-x-0 top-0 z-40 transition-transform duration-500 ease-out-quart',
          hidden && '-translate-y-[130%]',
        )}
      >
        {/* Çentikli cihazlarda safe-area kadar aşağıdan başlar */}
        <div className="container pt-[calc(0.75rem+env(safe-area-inset-top))] lg:pt-[calc(1rem+env(safe-area-inset-top))]">
          <div
            className={cn(
              'pointer-events-auto flex items-center justify-between gap-3 rounded-lg border pl-4 pr-3 transition-all duration-300 ease-out-quart lg:pl-5',
              stuck
                ? 'h-14 border-border bg-background/85 shadow-soft-lg backdrop-blur-xl'
                : dark
                  ? 'h-16 border-white/15 bg-[hsl(155_30%_7%_/_0.35)] shadow-soft backdrop-blur-md'
                  : 'h-16 border-border/70 bg-background/80 shadow-soft backdrop-blur-md',
            )}
          >
            <Link href="/" aria-label={content.brand} className="shrink-0">
              <Logo brand={content.brand} tone={dark ? 'light' : undefined} />
            </Link>

            <Suspense fallback={<DesktopNav pathname={pathname} tur={null} dark={dark} />}>
              <DesktopNavWithParams pathname={pathname} dark={dark} />
            </Suspense>

            <div className="hidden items-center gap-1.5 lg:flex">
              {/* Genişleyen arama — akışın dışında, komşuları itmeden açılır */}
              <div className="relative h-10 w-10 shrink-0">
                <form
                  onSubmit={submitSearch}
                  className={cn(
                    'absolute right-0 top-0 z-20 flex h-10 items-center overflow-hidden rounded-sm border transition-[width,border-color,background-color,box-shadow] duration-300 ease-out-quart',
                    searchOpen
                      ? 'w-52 border-input bg-card shadow-soft'
                      : 'w-10 border-transparent',
                  )}
                >
                  <button
                    ref={searchBtnRef}
                    type={searchOpen ? 'submit' : 'button'}
                    onClick={searchOpen ? undefined : openSearch}
                    aria-label="İlanlarda arayın"
                    aria-expanded={searchOpen}
                    className={cn(
                      'grid h-10 w-10 shrink-0 place-items-center rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      dark && !searchOpen
                        ? 'text-white/80 hover:bg-white/10 hover:text-white'
                        : 'text-foreground/70 hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    <Search className="h-[18px] w-[18px]" />
                  </button>
                  <input
                    ref={searchRef}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') closeSearch();
                    }}
                    onBlur={() => {
                      if (!q.trim()) setSearchOpen(false);
                    }}
                    placeholder="İlan ara"
                    aria-label="İlanlarda arayın"
                    tabIndex={searchOpen ? 0 : -1}
                    className="w-full bg-transparent pr-3 text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </form>
              </div>

              <a
                href={telLink(phone)}
                aria-label={`Telefon: ${phone}`}
                className={cn(
                  'flex items-center gap-2 rounded-sm px-3 py-2 text-[14px] font-semibold transition-colors',
                  dark
                    ? 'text-white/85 hover:bg-white/10 hover:text-white'
                    : 'text-foreground/80 hover:bg-secondary hover:text-foreground',
                )}
              >
                <Phone
                  className={cn('h-4 w-4', dark ? 'text-brass-ondark' : 'text-brass-strong')}
                />
                <span className="nums hidden xl:inline">{phone}</span>
              </a>

              {user ? (
                <div className="flex items-center gap-1">
                  <NotificationBell dark={dark} />
                  <Link
                    href="/hesap"
                    className={cn(
                      'flex items-center gap-2 rounded-sm px-3 py-2 text-[14px] font-semibold transition-colors',
                      dark
                        ? 'text-white/85 hover:bg-white/10 hover:text-white'
                        : 'text-foreground/80 hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    <User
                      className={cn('h-4 w-4', dark ? 'text-brass-ondark' : 'text-brass-strong')}
                    />
                    Hesabım
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    aria-label="Çıkış yap"
                    className={cn(
                      'grid h-9 w-9 place-items-center rounded-sm transition-colors',
                      dark
                        ? 'text-white/70 hover:bg-white/10 hover:text-white'
                        : 'text-foreground/70 hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/giris"
                  className={cn(
                    'rounded-sm px-3 py-2 text-[14px] font-semibold transition-colors',
                    dark
                      ? 'text-white/85 hover:bg-white/10 hover:text-white'
                      : 'text-foreground/80 hover:bg-secondary hover:text-foreground',
                  )}
                >
                  Giriş Yap
                </Link>
              )}

              <Button asChild variant="brass" size="sm" className="h-10 px-5">
                <Link href="/ilan-ver">İlan Ver</Link>
              </Button>
            </div>

            {/* Mobil menü */}
            <div className="lg:hidden">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <button
                    aria-label="Menüyü açın"
                    className={cn(
                      'grid h-11 w-11 place-items-center rounded-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      dark
                        ? 'border-white/25 text-white hover:bg-white/10'
                        : 'border-border text-foreground hover:bg-secondary',
                    )}
                  >
                    <Menu className="h-6 w-6" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[86%] max-w-sm overflow-y-auto p-0">
                  <SheetTitle className="sr-only">Menü</SheetTitle>
                  <div className="bg-primary px-6 py-6">
                    <Logo brand={content.brand} tone="light" />
                  </div>
                  {/* Masaüstündeki aramanın mobil karşılığı */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const v = q.trim();
                      if (!v) return;
                      setOpen(false);
                      setQ('');
                      router.push(`/ilanlar?q=${encodeURIComponent(v)}`);
                    }}
                    className="flex items-center gap-2 border-b border-border px-6 py-4"
                  >
                    <Search className="h-5 w-5 shrink-0 text-brass-strong" aria-hidden="true" />
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="İlan ara"
                      aria-label="İlanlarda arayın"
                      className="h-11 w-full bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </form>
                  <nav aria-label="Ana menü" className="flex flex-col px-6 py-4">
                    {navLinks.map((l) => (
                      <SheetClose asChild key={l.href}>
                        <Link
                          href={l.href}
                          className="border-b border-border py-4 text-lg font-medium text-foreground transition-colors hover:text-primary"
                        >
                          {l.label}
                        </Link>
                      </SheetClose>
                    ))}
                  </nav>
                  <div className="flex flex-col gap-3 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2">
                    <SheetClose asChild>
                      <Button asChild variant="brass" size="lg" className="h-12 text-base">
                        <Link href="/ilan-ver">İlan Ver</Link>
                      </Button>
                    </SheetClose>
                    <Button asChild variant="outline" size="lg" className="h-12 text-base">
                      <a href={telLink(phone)}>
                        <Phone className="size-5" />
                        {phone}
                      </a>
                    </Button>
                    {user ? (
                      <>
                        <SheetClose asChild>
                          <Button asChild variant="outline" size="lg" className="h-12 text-base">
                            <Link href="/hesap">
                              <User className="size-5" />
                              Hesabım
                            </Link>
                          </Button>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button
                            variant="ghost"
                            size="lg"
                            className="h-12 text-base"
                            onClick={handleSignOut}
                          >
                            <LogOut className="size-5" />
                            Çıkış Yap
                          </Button>
                        </SheetClose>
                      </>
                    ) : (
                      <>
                        <SheetClose asChild>
                          <Button asChild variant="outline" size="lg" className="h-12 text-base">
                            <Link href="/giris">Giriş Yap</Link>
                          </Button>
                        </SheetClose>
                        <SheetClose asChild>
                          <Button asChild variant="ghost" size="lg" className="h-12 text-base">
                            <Link href="/kayit-ol">Kayıt Ol</Link>
                          </Button>
                        </SheetClose>
                      </>
                    )}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
