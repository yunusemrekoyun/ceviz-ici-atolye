"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, CornerDownLeft, Search, X } from "lucide-react";
import { searchAction, type SearchHit } from "@/app/admin/(panel)/search-actions";
import { STATUS_BADGE, isRegistrationStatus } from "@/lib/registration-status";
import { normalizeForSearch } from "@/lib/search";
import { Avatar } from "./kit";

export type SearchPage = { href: string; label: string; icon: ReactNode };

type Row = { kind: "student"; hit: SearchHit } | { kind: "page"; page: SearchPage };

/** Sonuçları getirir: yazarken kısa gecikmeyle sunucuya sorar, eski yanıtları yok sayar. */
function useSearch(query: string, pages: SearchPage[]) {
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const mine = ++seq.current;
    if (q.length < 2) {
      const t = window.setTimeout(() => (setHits([]), setLoading(false)), 0);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchAction(q);
        if (mine === seq.current) setHits(res);
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, 160);
    return () => window.clearTimeout(t);
  }, [query]);

  const nq = normalizeForSearch(query);
  const pageRows: Row[] = (nq ? pages.filter((p) => normalizeForSearch(p.label).includes(nq)) : pages.slice(0, 6)).slice(0, 5).map((page) => ({ kind: "page", page }));
  const rows: Row[] = [...hits.map((hit) => ({ kind: "student", hit }) as Row), ...pageRows];
  return { rows, hits, loading };
}

function Results({ id, query, rows, loading, active, onPick, onHover }: { id?: string; query: string; rows: Row[]; loading: boolean; active: number; onPick: (r: Row) => void; onHover: (i: number) => void }) {
  const q = query.trim();
  const students = rows.filter((r) => r.kind === "student");
  const pages = rows.filter((r) => r.kind === "page");
  return (
    <div id={id} className="max-h-[min(70dvh,32rem)] overflow-y-auto overscroll-contain p-1.5" role="listbox" aria-label="Arama sonuçları">
      {q.length >= 2 && students.length === 0 && !loading ? <p className="px-3 py-4 text-sm text-muted">“{q}” ile eşleşen öğrenci ya da aday yok.</p> : null}
      {students.length ? <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted">Öğrenciler ve adaylar</p> : null}
      {students.map((r) => {
        const i = rows.indexOf(r);
        const hit = (r as { hit: SearchHit }).hit;
        return (
          <button
            key={`s${hit.id}`}
            type="button"
            role="option"
            aria-selected={i === active}
            onMouseMove={() => onHover(i)}
            onClick={() => onPick(r)}
            className={["flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition", i === active ? "bg-surface" : ""].join(" ")}
          >
            <Avatar name={hit.name} photoId={hit.photoId} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-ink">{hit.name}</span>
              <span className="block truncate text-xs text-muted">{hit.meta || "—"}</span>
            </span>
            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold ${isRegistrationStatus(hit.status) ? STATUS_BADGE[hit.status] : ""}`}>{hit.statusLabel}</span>
          </button>
        );
      })}
      {pages.length ? <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted">{q ? "Sayfalar" : "Hızlı geçiş"}</p> : null}
      {pages.map((r) => {
        const i = rows.indexOf(r);
        const page = (r as { page: SearchPage }).page;
        return (
          <button
            key={`p${page.href}`}
            type="button"
            role="option"
            aria-selected={i === active}
            onMouseMove={() => onHover(i)}
            onClick={() => onPick(r)}
            className={["flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-ink transition [&_svg]:h-4 [&_svg]:w-4", i === active ? "bg-surface" : ""].join(" ")}
          >
            <span className="text-muted">{page.icon}</span>
            <span className="flex-1">{page.label}</span>
            {i === active ? <ArrowRight className="text-muted" aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Üst çubukta genel arama. Masaüstünde kutu (⌘K ya da / ile odaklanır), telefonda tam ekran.
 * Öğrenci/aday seçilince dosyası, sayfa seçilince o sayfa açılır.
 */
export function GlobalSearch({ pages, enabled }: { pages: SearchPage[]; enabled: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const { rows, loading } = useSearch(enabled ? query : "", pages);

  const close = useCallback(() => {
    setOpen(false);
    setMobileOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  const pick = (r: Row) => {
    close();
    input.current?.blur();
    router.push(r.kind === "student" ? `/admin/kayit/${r.hit.id}` : r.page.href);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") || (e.key === "/" && !typing)) {
        e.preventDefault();
        if (window.matchMedia("(min-width: 1024px)").matches) {
          input.current?.focus();
          input.current?.select();
          setOpen(true);
        } else setMobileOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && rows[active]) {
      e.preventDefault();
      pick(rows[active]!);
    } else if (e.key === "Escape") {
      close();
      input.current?.blur();
    }
  };

  const placeholder = enabled ? "Öğrenci, veli, telefon ya da no ara" : "Sayfa ara";

  return (
    <>
      {/* Masaüstü */}
      <div ref={box} className="relative hidden w-full max-w-md lg:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          ref={input}
          type="search"
          value={query}
          onChange={(e) => (setQuery(e.target.value), setActive(0), setOpen(true))}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Genel arama"
          role="combobox"
          aria-expanded={open}
          aria-controls="panel-search-results"
          aria-autocomplete="list"
          autoComplete="off"
          className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-14 text-[15px] text-ink shadow-xs outline-none transition placeholder:text-stone-500 focus:border-gs-red/50 focus:ring-4 focus:ring-gs-red/10"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-line bg-surface px-1.5 font-sans text-xs font-semibold text-muted">⌘K</kbd>
        {open ? (
          <div className="panel-pop absolute inset-x-0 top-12 z-50 overflow-hidden rounded-xl border border-line bg-white shadow-[0_16px_40px_-12px_rgb(28_23_21/0.25)]">
            <Results id="panel-search-results" query={query} rows={rows} loading={loading} active={active} onPick={pick} onHover={setActive} />
            <p className="flex items-center gap-3 border-t border-line bg-surface/60 px-3 py-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" aria-hidden="true" /> aç
              </span>
              <span>↑↓ gezin</span>
              <span>esc kapat</span>
            </p>
          </div>
        ) : null}
      </div>

      {/* Telefon: simge → tam ekran */}
      <button type="button" onClick={() => setMobileOpen(true)} aria-label="Ara" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white/85 transition hover:bg-white/10 active:scale-95 lg:hidden">
        <Search className="h-[22px] w-[22px]" aria-hidden="true" />
      </button>
      {mobileOpen
        ? createPortal(
            <div className="fixed inset-0 z-[75] flex flex-col bg-white lg:hidden" role="dialog" aria-modal="true" aria-label="Ara">
              <div className="flex items-center gap-2 border-b border-line px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input
                    autoFocus
                    type="search"
                    value={query}
                    onChange={(e) => (setQuery(e.target.value), setActive(0))}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    aria-label="Genel arama"
                    autoComplete="off"
                    className="h-12 w-full rounded-xl bg-surface pl-10 pr-3 text-[16px] text-ink outline-none placeholder:text-stone-500 focus:ring-2 focus:ring-gs-red/30"
                  />
                </div>
                <button type="button" onClick={close} aria-label="Kapat" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-surface">
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
                <Results query={query} rows={rows} loading={loading} active={active} onPick={pick} onHover={setActive} />
              </div>
            </div>,
            // Üst çubuğun katmanından çıkar: alt menünün üstünde tam ekran açılır.
            document.querySelector(".admin-theme") ?? document.body,
          )
        : null}
    </>
  );
}
