import React from "react";

// Turnstile kutusu. Çoğu ziyaretçide görünmez; yalnız Cloudflare emin olamazsa
// tıklanacak bir kutu açılır.
export default function BotCheckField({ bot, className = "" }) {
  if (!bot.required) return null;
  return (
    <div className={className}>
      <div ref={bot.containerRef} />
      {bot.failed && (
        <p className="mt-1 text-xs text-red-600">
          Güvenlik doğrulaması yüklenemedi. Sayfayı yenileyip tekrar deneyin; reklam engelleyici
          kullanıyorsanız bu site için kapatın.
        </p>
      )}
    </div>
  );
}
