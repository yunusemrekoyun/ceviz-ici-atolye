'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  success: (title: string, message?: string) => void;
  error:   (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info:    (title: string, message?: string) => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// ── Config ───────────────────────────────────────────────────────────────────

const STYLES: Record<ToastType, { icon: React.ElementType; border: string; bg: string; iconColor: string; titleColor: string }> = {
  success: { icon: CheckCircle2, border: 'border-emerald-500/30', bg: 'bg-emerald-500/10',  iconColor: 'text-emerald-400', titleColor: 'text-emerald-200' },
  error:   { icon: XCircle,      border: 'border-red-500/30',     bg: 'bg-red-500/10',       iconColor: 'text-red-400',     titleColor: 'text-red-200'     },
  warning: { icon: AlertTriangle, border: 'border-amber-500/30',  bg: 'bg-amber-500/10',     iconColor: 'text-amber-400',   titleColor: 'text-amber-200'   },
  info:    { icon: Info,          border: 'border-sky-500/30',    bg: 'bg-sky-500/10',        iconColor: 'text-sky-400',     titleColor: 'text-sky-200'     },
};

const AUTO_DISMISS_MS = 4500;

// ── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
  }, [dismiss]);

  const ctx: ToastContextValue = {
    success: (t, m) => add('success', t, m),
    error:   (t, m) => add('error',   t, m),
    warning: (t, m) => add('warning', t, m),
    info:    (t, m) => add('info',    t, m),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* ── Toast stack ─────────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-[200] flex flex-col-reverse gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => {
            const { icon: Icon, border, bg, iconColor, titleColor } = STYLES[toast.type];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0,  scale: 1     }}
                exit={{    opacity: 0, x: 40,  scale: 0.95  }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className={`
                  pointer-events-auto w-80 flex items-start gap-3 px-4 py-3.5
                  rounded-xl border ${border} ${bg}
                  backdrop-blur-xl shadow-2xl
                `}
                style={{
                  background: 'color-mix(in srgb, var(--app-base) 70%, transparent)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
              >
                <Icon size={17} className={`${iconColor} shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-snug ${titleColor}`}>{toast.title}</p>
                  {toast.message && (
                    <p className="text-[11px] text-white/45 mt-0.5 leading-relaxed">{toast.message}</p>
                  )}
                </div>
                <button
                  onClick={() => dismiss(toast.id)}
                  className="shrink-0 text-white/25 hover:text-white/60 transition-colors mt-0.5 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
