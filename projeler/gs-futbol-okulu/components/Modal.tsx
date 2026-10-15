"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
  closeDisabled?: boolean;
  /** false ise karartılmış alana tıklamak modalı kapatmaz (düzenleme formu gibi kayıp riski olan içerikler için). */
  dismissOnOverlay?: boolean;
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Pencere: telefonda alttan açılan sayfa, masaüstünde ortada. Açılınca odak içeri alınır (içerideki autoFocus
 * alanı korunur), Tab pencere içinde döner, Esc kapatır, kapanınca odak açan düğmeye döner.
 */
export function Modal({ open, title, onClose, children, footer, size = "md", closeDisabled, dismissOnOverlay = true }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  // Üst bileşen her tuşta yeniden çizilse de (ör. not alanı) odak ve dinleyiciler yeniden kurulmasın.
  const closeRef = useRef(onClose);
  const disabledRef = useRef(closeDisabled);
  useEffect(() => {
    closeRef.current = onClose;
    disabledRef.current = closeDisabled;
  });

  // Tarayıcıda açıldıktan sonra sayfa kökünün altına çizilir: satır ya da kart içindeki katmanlara takılmaz.
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  useEffect(() => {
    if (!open || !mounted) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!disabledRef.current) closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const active = document.activeElement;
      // Pencereden açılan takvim gibi katmanlar kendi odağını yönetir.
      if (active && active !== document.body && !panel.contains(active) && active.closest("[role=dialog],[role=menu]")) return;
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items.at(-1)!;
      if (!panel.contains(active) || (e.shiftKey && (active === first || active === panel)) || (!e.shiftKey && active === last)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open, mounted]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="scrim-in fixed inset-0 z-[65] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !closeDisabled && dismissOnOverlay) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={[
          "sheet-in flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[20px] bg-white shadow-[0_-8px_40px_rgb(28_23_21/0.18)] outline-none sm:max-h-[90dvh] sm:rounded-2xl sm:shadow-[0_24px_64px_rgb(28_23_21/0.22)]",
          size === "lg" ? "sm:max-w-3xl" : "sm:max-w-xl",
        ].join(" ")}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-stone-300 sm:hidden" aria-hidden="true" />
        <header className="flex items-center justify-between gap-3 border-b border-line py-2 pl-4 pr-2 sm:py-3 sm:pl-5 sm:pr-3">
          <h2 className="min-w-0 text-[17px] font-bold leading-snug text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Kapat"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition hover:bg-stone-100 hover:text-ink active:scale-95 disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        <div className={["min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5", footer ? "" : "pb-[calc(1rem+env(safe-area-inset-bottom))]"].join(" ")}>{children}</div>
        {footer ? (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-line bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5 sm:pb-3 max-sm:[&>*]:flex-1">{footer}</footer>
        ) : null}
      </div>
    </div>,
    document.querySelector(".admin-theme") ?? document.body,
  );
}

const noop = () => () => {};
