import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EVENT } from "../utils/progressBus";

const AUTO_REMOVE_MS = {
  done: 5000,
  error: 12000,
};

const statusStyles = {
  active:
    "from-slate-200/60 via-white to-white text-slate-900 border-slate-200 shadow-slate-300/40 dark:from-[#1c1f24] dark:via-[#1a1d22] dark:to-[#171a1f] dark:text-slate-100 dark:border-[#2c2f36]",
  done:
    "from-emerald-200/40 via-white to-white text-emerald-900 border-emerald-200/70 shadow-emerald-300/30 dark:from-[#1c2a21] dark:via-[#1a1f22] dark:to-[#16191d] dark:text-emerald-100 dark:border-emerald-500/30",
  error:
    "from-rose-200/40 via-white to-white text-rose-900 border-rose-200/70 shadow-rose-300/30 dark:from-[#2a1c20] dark:via-[#1a1d22] dark:to-[#16191d] dark:text-rose-100 dark:border-rose-500/30",
};

const ProgressCenter = () => {
  const [tasks, setTasks] = useState([]);
  const timers = useRef({});

  const dismissTask = useCallback((id) => {
    if (!id) return;
    setTasks((prev) => prev.filter((task) => task.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail || {};
      const { id, label, progress, status, message } = detail;
      if (!id) return;
      setTasks((prev) => {
        const existing = prev.find((t) => t.id === id);
        if (!existing) {
          return [
            {
              id,
              label: label || "İşlem",
              progress: typeof progress === "number" ? progress : 0,
              status: status || "active",
              message: message || "",
              createdAt: Date.now(),
            },
            ...prev,
          ];
        }

        return prev.map((t) =>
          t.id === id
            ? {
                ...t,
                label: label || t.label,
                message: message ?? t.message,
                status: status || t.status,
                progress:
                  typeof progress === "number"
                    ? Math.min(100, Math.max(0, progress))
                    : t.progress,
              }
            : t
        );
      });
    };

    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  // Otomatik temizle: success kısa, error daha uzun süre kalsın
  useEffect(() => {
    tasks.forEach((t) => {
      if (t.status === "active" || timers.current[t.id]) return;
      const timeoutMs = AUTO_REMOVE_MS[t.status];
      if (!timeoutMs) return;
      timers.current[t.id] = setTimeout(() => {
        dismissTask(t.id);
      }, timeoutMs);
    });
    return () => {
      Object.values(timers.current || {}).forEach(clearTimeout);
      timers.current = {};
    };
  }, [dismissTask, tasks]);

  const sorted = useMemo(
    () =>
      [...tasks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5), // en fazla 5 öğe göster
    [tasks]
  );

  if (!sorted.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-[320px] max-w-[calc(100vw-1.5rem)]">
      <AnimatePresence initial={false}>
        {sorted.map((task) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className={`mb-3 rounded-2xl border backdrop-blur-2xl bg-gradient-to-br ${
              statusStyles[task.status] || statusStyles.active
            } shadow-xl`}
          >
            <div className="flex items-start gap-2 px-4 py-3">
              <div className="mt-1 h-2 w-2 rounded-full bg-slate-600 shadow shadow-slate-200 dark:bg-slate-300 dark:shadow-slate-900" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold leading-tight text-slate-900 dark:text-white">
                    {task.label}
                  </p>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    {Math.round(task.progress)}%
                  </span>
                </div>
                {task.message && (
                  <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-200 break-words">
                    {task.message}
                  </p>
                )}
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${
                      task.status === "done"
                        ? "bg-emerald-400"
                        : task.status === "error"
                        ? "bg-rose-400"
                        : "bg-sky-400"
                    }`}
                    style={{ width: `${Math.min(100, task.progress)}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => dismissTask(task.id)}
                    className="text-[11px] font-medium text-slate-600 underline-offset-2 transition hover:underline dark:text-slate-300"
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ProgressCenter;
