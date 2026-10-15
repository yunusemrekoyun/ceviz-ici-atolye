import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { useEffect } from "react";

/**
 * Basit, site stiline uygun onay diyaloğu
 *
 * Props:
 * open: boolean
 * title?: string
 * message: string | ReactNode
 * confirmText?: string (default: "Evet")
 * cancelText?: string (default: "Vazgeç")
 * onConfirm: () => void
 * onCancel: () => void
 * type?: "danger" | "info" | "success"  (buton rengi için)
 */
export default function ConfirmDialog({
  open,
  title = "Onay",
  message,
  confirmText = "Evet",
  cancelText = "Vazgeç",
  onConfirm,
  onCancel,
  type = "danger",
  loading = false,
}) {
  // ESC kapatma
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== "Escape" || loading) return;
      onCancel?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loading, open, onCancel]);

  if (!open) return null;

  const colorMap = {
    danger: "from-rose-500 to-orange-500 shadow-rose-500/25",
    info: "from-indigo-500 to-sky-500 shadow-indigo-500/25",
    success: "from-emerald-500 to-teal-500 shadow-emerald-500/25",
  };
  const confirmBtn = colorMap[type] || colorMap.info;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={loading ? undefined : onCancel}
      />
      {/* modal */}
      <div className="relative z-10 w-[92vw] max-w-md admin-card p-6">
        <div className="absolute inset-x-6 top-2 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-500/60" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-200/90">{message}</div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="btn-admin-ghost disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={loading ? undefined : onConfirm}
            disabled={loading}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-[1px] active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed ${confirmBtn}`}
          >
            {loading ? "İşleniyor…" : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

ConfirmDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string,
  message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  type: PropTypes.oneOf(["danger", "info", "success"]),
  loading: PropTypes.bool,
};
