'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { toggleFavorite } from '@/app/(site)/hesap/favoriler/actions';
import { authClient } from '@/lib/auth-client';
import { cn } from '@/lib/utils';

type Ctx = {
  favored: Set<string>;
  toggle: (slug: string) => void;
};

const FavoritesContext = createContext<Ctx>({ favored: new Set(), toggle: () => {} });

/** Favori durumu tek seferde yüklenir (kartlar ISR — kullanıcıya özel durum
 * client'ta); kalpler optimistic çalışır. */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [favored, setFavored] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!session?.user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- oturum kapanınca durumu sıfırlama (bağımlılık değişiminde reset)
      setFavored(new Set());
      return;
    }
    let alive = true;
    fetch('/api/favoriler')
      .then((r) => (r.ok ? r.json() : { slugs: [] }))
      .then((d) => {
        if (alive) setFavored(new Set(d.slugs ?? []));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [session?.user]);

  const toggle = useCallback(
    (slug: string) => {
      if (!session?.user) {
        router.push(`/giris?callbackURL=${encodeURIComponent(pathname)}`);
        return;
      }
      setFavored((prev) => {
        const next = new Set(prev);
        if (next.has(slug)) next.delete(slug);
        else next.add(slug);
        return next;
      });
      void toggleFavorite(slug).then((result) => {
        if (!result.ok) {
          // geri al — sunucu reddetti
          setFavored((prev) => {
            const next = new Set(prev);
            if (next.has(slug)) next.delete(slug);
            else next.add(slug);
            return next;
          });
          // client session önbelleği dolu ama sunucuda oturum düşmüş olabilir
          if (result.error === 'GIRIS') {
            router.push(`/giris?callbackURL=${encodeURIComponent(pathname)}`);
          }
        }
      });
    },
    [session?.user, router, pathname],
  );

  return (
    <FavoritesContext.Provider value={{ favored, toggle }}>{children}</FavoritesContext.Provider>
  );
}

export function FavoriteButton({ slug, className }: { slug: string; className?: string }) {
  const { favored, toggle } = useContext(FavoritesContext);
  const active = favored.has(slug);
  return (
    <button
      type="button"
      aria-label={active ? 'Favorilerden çıkar' : 'Favorilere ekle'}
      aria-pressed={active}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
      className={cn(
        'grid h-10 w-10 place-items-center rounded-full border backdrop-blur-sm transition-all',
        active
          ? 'border-brass bg-brass text-brass-foreground'
          : 'border-white/40 bg-[hsl(155_30%_7%_/_0.35)] text-white hover:border-white/70',
        className,
      )}
    >
      <Heart className={cn('h-[18px] w-[18px]', active && 'fill-current')} />
    </button>
  );
}
