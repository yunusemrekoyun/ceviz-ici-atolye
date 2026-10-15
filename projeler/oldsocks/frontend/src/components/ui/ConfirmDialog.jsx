import React from "react";
import { createPortal } from "react-dom";
import Window from "./Window";

const TONE_STYLES = {
  primary: "bg-black text-white hover:bg-gray-800",
  danger: "bg-red-600 text-white hover:bg-red-700",
  warning: "bg-amber-500 text-white hover:bg-amber-600",
};

export default function ConfirmDialog({
  open,
  title = "Onay",
  message,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgeç",
  tone = "primary",
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const confirmClassName = TONE_STYLES[tone] || TONE_STYLES.primary;

  return createPortal(
    <Window
      title={title}
      onClose={loading ? undefined : onCancel}
      showFullscreenToggle={false}
      zIndexClass="z-[10050]"
      maxWidthClass="sm:max-w-md"
      footer={
        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmClassName}`}
          >
            {loading ? "İşleniyor..." : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="text-sm text-gray-700">
        {typeof message === "string" ? (
          <p className="whitespace-pre-line">{message}</p>
        ) : (
          message
        )}
      </div>
    </Window>,
    document.body
  );
}
