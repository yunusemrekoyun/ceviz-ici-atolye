import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { FaTimes } from "react-icons/fa";

/**
 * Kullanıcı giriş yapmadığında gösterilen pop-up.
 *
 * Props
 * ───────────────
 * open      : boolean            → Modal açık mı?
 * onClose   : () => void         → Çarpıya basıldığında
 * onLogin   : () => void         → “Giriş Yap” butonu
 * onGuest   : () => void         → “Üye olmadan devam et” (opsiyonel)
 * title     : string             → Başlık (opsiyonel)
 * message   : string             → Mesaj (opsiyonel)
 */
export default function AuthRequiredModal({
  open,
  onClose,
  onLogin,
  onGuest,
  title = "Giriş Yapmanız Gerekiyor",
  message = "Ödeme işlemine devam edebilmek için lütfen hesabınıza giriş yapın.",
}) {
  const titleId = useId();
  const firstButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Açılınca odak pencereye gelir, Escape kapatır, kapanınca odak geri döner.
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    firstButtonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previous && typeof previous.focus === "function") previous.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-sm bg-white rounded-xl p-6 shadow-lg"
      >
        {/* Çarpı */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
          aria-label="Kapat"
        >
          <FaTimes size={20} />
        </button>

        <h2 id={titleId} className="text-xl font-semibold mb-2 text-dark1">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>

        <div className={`flex ${onGuest ? "flex-col gap-3" : ""}`}>
          <button
            ref={firstButtonRef}
            type="button"
            onClick={onLogin}
            className="w-full py-3 bg-dark1 hover:bg-dark2 text-white rounded-full font-medium transition"
          >
            Giriş Yap
          </button>

          {onGuest && (
            <button
              onClick={onGuest}
              className="w-full py-3 bg-light2 hover:bg-light1 text-dark2 rounded-full font-medium transition"
            >
              Üye Olmadan Devam Et
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
