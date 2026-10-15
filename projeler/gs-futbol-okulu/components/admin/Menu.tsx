"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type MenuItem =
  | { label: string; icon?: ReactNode; onSelect: () => void; tone?: "danger"; disabled?: boolean; hint?: string }
  | { label: string; icon?: ReactNode; href: string; external?: boolean; download?: boolean; tone?: "danger"; hint?: string }
  | { divider: true };

/**
 * Açılır eylem menüsü. Panel kökünün altına `position: fixed` ile çizilir; kaydırılan, taşması gizli ya da katmanlı kutularda kırpılmaz.
 * Altta yer yoksa yukarı açılır. Esc, dışarı tıklama ve seçimle kapanır.
 */
export function Menu({ trigger, items: raw, align = "end", label }: { trigger: (props: { onClick: () => void; "aria-expanded": boolean; "aria-haspopup": "menu"; "aria-controls": string }) => ReactNode; items: MenuItem[]; align?: "start" | "end"; label: string }) {
  // Baştaki, sondaki ve art arda gelen ayırıcılar atılır.
  const items = raw.filter((it, i, all) => !("divider" in it) || (i > 0 && i < all.length - 1 && !("divider" in all[i - 1]!)));
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchor.current?.getBoundingClientRect();
      const p = panel.current;
      if (!a || !p) return;
      const w = p.offsetWidth;
      const h = p.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = align === "end" ? a.right - w : a.left;
      left = Math.max(8, Math.min(left, vw - w - 8));
      const below = a.bottom + 6;
      const top = below + h > vh - 8 && a.top - h - 6 > 8 ? a.top - h - 6 : Math.min(below, vh - h - 8);
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!panel.current?.contains(e.target as Node) && !anchor.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        (anchor.current?.querySelector("button, a") as HTMLElement | null)?.focus();
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const els = [...(panel.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([aria-disabled=true])") ?? [])];
        if (!els.length) return;
        e.preventDefault();
        const i = els.indexOf(document.activeElement as HTMLElement);
        els[(i + (e.key === "ArrowDown" ? 1 : -1) + els.length) % els.length]?.focus();
      }
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    panel.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemCls = (tone?: "danger", disabled?: boolean) =>
    [
      "flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium outline-none transition pointer-coarse:min-h-11",
      tone === "danger" ? "text-red-700 hover:bg-red-50 focus:bg-red-50" : "text-ink hover:bg-surface focus:bg-surface",
      disabled ? "pointer-events-none opacity-45" : "",
      "[&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:text-muted",
    ].join(" ");

  return (
    <>
      <span ref={anchor} className="inline-flex">
        {trigger({ onClick: () => setOpen((v) => !v), "aria-expanded": open, "aria-haspopup": "menu", "aria-controls": id })}
      </span>
      {open ? createPortal(
        <div
          ref={panel}
          id={id}
          role="menu"
          aria-label={label}
          style={{ position: "fixed", top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
          className="panel-pop z-[80] min-w-56 max-w-[calc(100vw-16px)] rounded-xl border border-line bg-white p-1 shadow-[0_12px_32px_-8px_rgb(28_23_21/0.22),0_2px_6px_rgb(28_23_21/0.06)]"
        >
          {items.map((item, i) => {
            if ("divider" in item) return <div key={`d${i}`} role="separator" className="my-1 h-px bg-line" />;
            const body = (
              <>
                {item.icon}
                <span className="min-w-0 flex-1">
                  {item.label}
                  {item.hint ? <span className="block text-xs font-normal text-muted">{item.hint}</span> : null}
                </span>
              </>
            );
            if ("href" in item) {
              if (item.external || item.download || !item.href.startsWith("/"))
                return (
                  <a key={item.label} role="menuitem" href={item.href} {...(item.external ? { target: "_blank", rel: "noopener" } : {})} {...(item.download ? { download: true } : {})} onClick={() => setOpen(false)} className={itemCls(item.tone)}>
                    {body}
                  </a>
                );
              return (
                <Link key={item.label} role="menuitem" href={item.href} onClick={() => setOpen(false)} className={itemCls(item.tone)}>
                  {body}
                </Link>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                aria-disabled={item.disabled || undefined}
                onClick={() => {
                  if (item.disabled) return;
                  setOpen(false);
                  item.onSelect();
                }}
                className={itemCls(item.tone, item.disabled)}
              >
                {body}
              </button>
            );
          })}
        </div>,
        // Satırlardaki katman düzeninden kurtulmak için panel kökünün altına çizilir (tema değişkenleri korunur).
        document.querySelector(".admin-theme") ?? document.body,
      ) : null}
    </>
  );
}
