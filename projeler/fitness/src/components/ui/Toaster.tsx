"use client";

import { useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { ToastContext, type ToastType } from "@/contexts/ToastContext";

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
  error:   <XCircle    className="w-4 h-4 text-rose-400" />,
  info:    <Info       className="w-4 h-4 text-sky-400" />,
  warn:    <AlertTriangle className="w-4 h-4 text-amber-400" />,
};

const BORDER: Record<ToastType, string> = {
  success: "border-emerald-500/30",
  error:   "border-rose-500/30",
  info:    "border-sky-500/30",
  warn:    "border-amber-500/30",
};

export function Toaster() {
  const ctx = useContext(ToastContext);
  if (!ctx) return null;
  const { toasts, dismiss } = ctx;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl bg-[var(--bg-card)] backdrop-blur border ${BORDER[t.type]} shadow-xl max-w-sm`}
          >
            <span className="mt-0.5 shrink-0">{ICONS[t.type]}</span>
            <span className="text-sm text-strong flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-faint hover:text-dim transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
