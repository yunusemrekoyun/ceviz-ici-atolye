'use client';

import { useEffect, useRef } from 'react';

/**
 * Sayfa geneli parallax — tek paylaşılan rAF döngüsü. Kayıtlı her eleman için
 * viewport-merkez farkını hesaplayıp `--par` (px) CSS değişkenini yazar; CSS
 * `translate3d(0, var(--par), 0)` uygular. Yalnızca transform (GPU), layout
 * yok. Kaydırma asla ele geçirilmez; bu sadece konum okur.
 *
 * reduced-motion açıksa ya da ekran < 1024px ise kayıt yapılmaz → sabit
 * (mobil şimdilik sade; JS-yok'ta da güvenli çünkü --par tanımsız = 0).
 */
type Entry = { el: HTMLElement; amp: number };

const entries = new Set<Entry>();
let raf = 0;
let bound = false;

function tick() {
  raf = 0;
  const vh = window.innerHeight || 1;
  const mid = vh / 2;
  entries.forEach(({ el, amp }) => {
    const r = el.getBoundingClientRect();
    const center = r.top + r.height / 2;
    const ratio = (center - mid) / vh; // ~ -1 (üstte) .. +1 (altta)
    el.style.setProperty('--par', `${(-ratio * amp).toFixed(1)}px`);
  });
}

function request() {
  if (!raf) raf = requestAnimationFrame(tick);
}

function bind() {
  if (bound) return;
  bound = true;
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request, { passive: true });
}

export function useParallax<T extends HTMLElement = HTMLDivElement>(amp = 20) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wide = window.matchMedia('(min-width: 1024px)').matches;
    if (reduce || !wide) return;
    const entry: Entry = { el, amp };
    entries.add(entry);
    bind();
    request();
    return () => {
      entries.delete(entry);
      el.style.removeProperty('--par');
    };
  }, [amp]);
  return ref;
}
