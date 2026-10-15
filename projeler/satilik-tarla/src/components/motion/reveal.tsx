'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Scroll-reveal sargısı: blok görünüme girince aşağıdan yumuşakça belirir.
 * Tek seferlik. `delay` ile ardışık kartlara sıralı (stagger) giriş verilir.
 * `immediate` ekranın üstündeki (LCP) bloklar için: sunucuda görünür render
 * edilir, giriş flaşı ve LCP gecikmesi olmaz.
 *
 * Dayanıklılık: mount anında zaten görünür ya da yukarı kaydırılıp geçilmiş
 * elemanlar anında açılır (derin bağlantı / #çapa ile inişte gizli kalmaz).
 * prefers-reduced-motion ve JS-yok durumları globals.css güvenceye alır.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  immediate = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(immediate);

  useEffect(() => {
    if (immediate) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- IO desteği yoksa içerik gizli kalmasın
      setShown(true);
      return;
    }
    // Zaten görünürse ya da yukarıda kalmışsa hemen aç (gizli kalma riskini kes)
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [immediate]);

  return (
    <div
      ref={ref}
      className={cn('reveal', className)}
      data-shown={shown ? 'true' : 'false'}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
