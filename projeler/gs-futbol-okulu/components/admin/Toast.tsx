"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Panel bildirimleri: ekranın altında sabit durur (sayfa kaysa da görünür), isteğe bağlı "Geri Al" düğmesi taşır.
 * Mobilde alt menünün üstünde konumlanır.
 */
export type ToastInput = { kind?: "success" | "error"; text: string; action?: { label: string; onClick: () => void } };
type ToastItem = ToastInput & { id: number };

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const nextId = useRef(1);

  const show = useCallback((input: ToastInput) => {
    window.clearTimeout(timer.current);
    setToast({ ...input, id: nextId.current++ });
    // Geri alınabilir işlemlerde kullanıcıya daha uzun süre tanınır.
    timer.current = window.setTimeout(() => setToast(null), input.action ? 7000 : 4000);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[70] flex justify-center px-4 lg:bottom-6" aria-live="polite">
        {toast ? (
          <div
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
            className={[
              "toast-in pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-[15px] shadow-2xl",
              toast.kind === "error" ? "bg-red-700 text-white" : "bg-ink text-white",
            ].join(" ")}
          >
            <span className="flex-1">{toast.text}</span>
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  setToast(null);
                }}
                className="min-h-10 shrink-0 cursor-pointer rounded-xl bg-white/15 px-3 text-sm font-bold text-gs-yellow transition hover:bg-white/25 active:scale-95"
              >
                {toast.action.label}
              </button>
            ) : null}
            <button type="button" onClick={() => setToast(null)} aria-label="Kapat" className="-mr-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
