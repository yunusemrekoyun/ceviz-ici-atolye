"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Liste süzgeçleri, arama ve sıralama adreste durur (`?grup=3&liste=aidat`). Öğrenci dosyasına girip geri gelince,
 * sayfa yenilenince ya da bağlantı paylaşılınca aynı liste açılır. Varsayılan değerler adrese yazılmaz.
 *
 * Değerler yalnız metin; çoklu seçim virgülle birleştirilir. Yazılan alanlar (`typed`, ör. arama) adrese kısa bir
 * gecikmeyle yazılır, her tuşta değil; bu arada başka sayfaya geçilirse o sayfanın adresine dokunulmaz.
 */
export function useUrlFilters<S extends Record<string, string>>(defaults: S, options: { valid?: Partial<Record<keyof S, (v: string) => boolean>>; typed?: (keyof S)[] } = {}) {
  const { valid, typed = [] } = options;
  const params = useSearchParams();
  const pathname = usePathname();
  const [values, setValues] = useState<S>(() => {
    const out = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof S & string)[]) {
      const raw = params.get(key);
      if (raw !== null && (!valid?.[key] || valid[key]!(raw))) out[key] = raw as S[typeof key];
    }
    return out;
  });
  const pending = useRef<Partial<S> | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const defaultsRef = useRef(defaults);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const patch = pending.current;
    pending.current = null;
    if (!patch || window.location.pathname !== pathname) return;
    const u = new URL(window.location.href);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "" || v === defaultsRef.current[k]) u.searchParams.delete(k);
      else u.searchParams.set(k, v);
    }
    if (u.href !== window.location.href) window.history.replaceState(null, "", u);
  }, [pathname]);

  useEffect(() => flush, [flush]);

  const set = useCallback(
    (patch: Partial<S>) => {
      setValues((prev) => ({ ...prev, ...patch }));
      pending.current = { ...(pending.current ?? {}), ...patch };
      window.clearTimeout(timer.current);
      if (Object.keys(patch).every((k) => typed.includes(k as keyof S))) timer.current = window.setTimeout(flush, 300);
      else flush();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- typed sabit bir liste
    [flush],
  );

  const reset = useCallback(
    (keep: (keyof S)[] = []) => {
      const next = { ...defaultsRef.current };
      setValues((prev) => {
        for (const k of keep) next[k] = prev[k];
        return next;
      });
      pending.current = { ...(pending.current ?? {}), ...defaultsRef.current };
      for (const k of keep) delete pending.current[k];
      flush();
    },
    [flush],
  );

  /** Varsayılandan farklı süzgeç sayısı (`ignore` dışındakiler). */
  const changed = useCallback((ignore: (keyof S)[] = []) => (Object.keys(defaultsRef.current) as (keyof S)[]).filter((k) => !ignore.includes(k) && values[k] !== defaultsRef.current[k]).length, [values]);

  return { values, set, reset, changed };
}

const BACK_KEY = "gs:liste:";

/**
 * Listenin son adresini (süzgeçleriyle) hatırlar; öğrenci dosyasındaki "← Öğrenciler" bağlantısı oraya döner.
 * Sekme kapanınca unutulur (sessionStorage).
 */
export function useRememberList(): void {
  const params = useSearchParams();
  const pathname = usePathname();
  const search = params.toString();
  useEffect(() => {
    try {
      sessionStorage.setItem(BACK_KEY + pathname, search ? `${pathname}?${search}` : pathname);
    } catch {
      // gizli sekme / depolama kapalı: bağlantı süzgeçsiz listeye döner
    }
  }, [pathname, search]);
}

const noSubscribe = () => () => {};

/** Listeye dönüş adresi: hatırlanan süzgeçli adres, yoksa listenin kendisi. Sunucuda listenin kendisi. */
export function useListHref(path: string): string {
  return useSyncExternalStore(
    noSubscribe,
    () => {
      try {
        return sessionStorage.getItem(BACK_KEY + path) ?? path;
      } catch {
        return path; // depolama yok: süzgeçsiz liste
      }
    },
    () => path,
  );
}

/** Virgülle birleştirilmiş çoklu seçim değeri için yardımcılar. */
export function splitList(value: string): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

export function useSplit(value: string): string[] {
  return useMemo(() => splitList(value), [value]);
}
