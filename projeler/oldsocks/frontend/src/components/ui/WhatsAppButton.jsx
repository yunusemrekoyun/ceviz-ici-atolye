import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";

// Ödeme sayfasında PayTR formunun üstüne binmesin.
const HIDDEN_PATHS = ["/payment"];

export default function WhatsAppButton() {
  const { pathname } = useLocation();
  const phone = import.meta.env.VITE_WHATSAPP_NUMBER || "+905414282989";
  const pre = import.meta.env.VITE_WHATSAPP_PRETEXT || "Merhaba!";
  const text = encodeURIComponent(pre);

  // wa.me formatı (en stabil)
  const href = useMemo(
    () => `https://wa.me/${phone}?text=${text}`,
    [phone, text]
  );

  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp ile sohbet başlat"
      className="
        fixed
        right-4 bottom-4
        md:right-6 md:bottom-6
        z-[1000]
        inline-flex items-center justify-center
        w-12 h-12 md:w-16 md:h-16
        rounded-full
        bg-[#25D366] text-white
        shadow-lg shadow-black/20
        hover:brightness-110 active:scale-95
        transition
      "
      // iOS safe-area
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
      }}
    >
      <FaWhatsapp className="w-6 h-6 md:w-8 md:h-8" />
    </a>
  );
}
