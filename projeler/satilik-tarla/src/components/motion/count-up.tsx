'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * "Ölçen" sayı: görüş alanına girince 0'dan hedefe sayar. Bir metin
 * ("120+", "%100", "6", "12.500 m²") verilir; içindeki sayı animasyonlanır,
 * önek/sonek (₺, %, +, m², nokta) korunur. reduced-motion / IO-yok →
 * anında son değer. Erişilebilir: gerçek metin DOM'da, animasyon dekoratif.
 */
export function CountUp({
  value,
  duration = 1100,
  className,
}: {
  value: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Metindeki ilk sayıyı bul (binlik nokta dahil): "12.500" → 12500
    const match = value.match(/[\d.]+/);
    if (!match) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- value prop'u değişince animasyonsuz durumda görüneni eşitler
      setDisplay(value);
      return;
    }
    const raw = match[0];
    const target = parseInt(raw.replace(/\./g, ''), 10);
    const grouped = raw.includes('.');
    const prefix = value.slice(0, match.index);
    const suffix = value.slice((match.index ?? 0) + raw.length);

    const fmt = (n: number) => {
      const s = grouped ? n.toLocaleString('tr-TR') : String(n);
      return `${prefix}${s}${suffix}`;
    };

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Küçük sayılarda sayma anlamsız ve "0" flaşı yanıltıcı ("ilan yok" gibi)
    if (
      reduce ||
      typeof IntersectionObserver === 'undefined' ||
      !Number.isFinite(target) ||
      target < 2
    ) {
      setDisplay(value);
      return;
    }

    // Ekran dışıyken son değer görünür kalır (ekran okuyucu/SEO doğru);
    // sıfırdan sayma yalnızca öğe görünüme girince başlar.
    let rafId = 0;
    let started = false;
    const run = () => {
      setDisplay(fmt(0));
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        // ease-out
        const eased = 1 - Math.pow(1 - t, 3);
        setDisplay(fmt(Math.round(target * eased)));
        if (t < 1) rafId = requestAnimationFrame(step);
        else setDisplay(value);
      };
      rafId = requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (obs) => {
        if (obs[0]?.isIntersecting && !started) {
          started = true;
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
