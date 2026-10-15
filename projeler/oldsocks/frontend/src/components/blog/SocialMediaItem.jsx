import React, { useEffect, useRef } from "react";

export default function SocialMediaItem({ embedLink, caption }) {
  const containerRef = useRef(null);

  // Instagram embed'i işle ve genişliği zorla
  const processAndTune = () => {
    // Instagram dönüştürsün
    window.instgrm?.Embeds?.process();

    const tune = () => {
      const host = containerRef.current;
      if (!host) return;

      // Blockquote + wrapper + iframe => %100 genişlik / margin 0
      host.style.width = "100%";
      host.style.maxWidth = "100%";
      host.style.minWidth = "0";
      host.style.margin = "0";

      const wrapper = host.querySelector(":scope > div");
      if (wrapper) {
        wrapper.style.width = "100%";
        wrapper.style.maxWidth = "100%";
        wrapper.style.minWidth = "0";
        wrapper.style.margin = "0";
      }

      const iframe = host.querySelector("iframe");
      if (iframe) {
        iframe.style.width = "100%";
        iframe.style.maxWidth = "100%";
        iframe.style.minWidth = "0";
        // Yüksekliği Instagram ayarlasın (iç scroll oluşmasın diye height'a dokunmuyoruz)
      }
    };

    // İlk ayar küçük gecikmeyle
    const t1 = setTimeout(tune, 60);

    // Sonradan eklenen node'ları da yakala
    const mo = new MutationObserver(() => setTimeout(tune, 0));
    if (containerRef.current) {
      mo.observe(containerRef.current, { childList: true, subtree: true });
    }

    return () => {
      clearTimeout(t1);
      mo.disconnect();
    };
  };

  // Script yükle + ilk işleme
  useEffect(() => {
    let cleanup = () => {};
    const existing = document.getElementById("instagram-embed-script");
    if (!existing) {
      const script = document.createElement("script");
      script.id = "instagram-embed-script";
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      script.onload = () => (cleanup = processAndTune());
      document.body.appendChild(script);
    } else {
      cleanup = processAndTune();
    }
    return () => cleanup?.();
  }, []);

  // Link değişince yeniden işle
  useEffect(() => {
    processAndTune();
  }, [embedLink]);

  return (
    <div className="w-full flex flex-col">
      {/* YÜKSEKLİĞİ ZORLAMıyoruz; embed doğal boyutunda uzuyor -> iç scroll yok */}
      <blockquote
        ref={containerRef}
        className="instagram-media"
        data-instgrm-permalink={embedLink}
        data-instgrm-version="14"
        style={{
          background: "#fff",
          border: 0,
          margin: 0,
          padding: 0,
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
        }}
      />

      {caption && (
        <p className="text-xs text-gray-600 text-center mt-2 px-2 line-clamp-2">
          {caption}
        </p>
      )}

      {/* Global override: Instagram’ın min/max & margin dayatmalarını kır */}
      <style>{`
        .instagram-media { width: 100% !important; max-width: 100% !important; min-width: 0 !important; margin: 0 !important; }
        .instagram-media > div { width: 100% !important; max-width: 100% !important; min-width: 0 !important; margin: 0 !important; }
        .instagram-media iframe { width: 100% !important; max-width: 100% !important; min-width: 0 !important; }
      `}</style>
    </div>
  );
}
