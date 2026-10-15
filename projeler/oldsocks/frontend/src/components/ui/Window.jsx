// src/components/ui/Window.jsx
import React, { useState, useRef, useEffect } from "react";

export default function Window({
  title,
  children,
  onClose,
  footer,
  showFullscreenToggle = true,
  zIndexClass = "z-[999]",
  maxWidthClass = "sm:max-w-4xl md:max-w-5xl",
}) {
  const [isFull, setIsFull] = useState(false);
  const ref = useRef(null);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // ESC ile kapat
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center p-2 sm:p-4 ${zIndexClass}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        className={[
          "relative bg-white shadow-xl border flex flex-col transition-all duration-300",
          // boyutlandırma
          isFull
            ? "w-full h-full rounded-none sm:rounded-2xl"
            : `w-full max-w-[100%] ${maxWidthClass} max-h-[95vh] sm:max-h-[90vh] rounded-xl`,
        ].join(" ")}
      >
        {/* Header (sticky) */}
        <div className="sticky top-0 z-10 bg-white border-b px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <h2
            className="text-base sm:text-lg font-semibold truncate"
            title={typeof title === "string" ? title : undefined}
          >
            {title}
          </h2>

          <div className="flex items-center gap-2">
            {showFullscreenToggle && (
              <button
                type="button"
                onClick={() => setIsFull((f) => !f)}
                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
                title={isFull ? "Pencereyi küçült" : "Tam ekran yap"}
              >
                {isFull ? "⇲" : "⇱"}
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
                title="Kapat"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Body (scrollable) */}
        <div className="px-3 sm:px-6 py-4 overflow-auto">{children}</div>

        {/* Footer (opsiyonel, sticky) */}
        {footer && (
          <div className="sticky bottom-0 z-10 bg-white border-t px-3 sm:px-6 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
