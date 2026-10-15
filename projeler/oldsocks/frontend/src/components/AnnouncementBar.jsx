import React, { useEffect, useMemo, useRef, useState } from "react";
import publicApi from "../../publicApi";

// Duyuru çubuğu sonradan eklenince sayfanın tamamı aşağı kayar (CLS). Son görülen
// duyuru saklanır ve hemen gösterilir; ilk ziyarette yükleme sürerken yer ayrılır.
const CACHE_KEY = "announcementBar.cache";

function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    return cached && typeof cached === "object" ? cached : null;
  } catch {
    return null;
  }
}

export default function AnnouncementBar() {
  const [data, setData] = useState(readCache);
  const [loaded, setLoaded] = useState(false);
  const trackRef = useRef(null);
  const msgRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await publicApi.get("/announcement-bar");
        const next = {
          enabled: !!data?.enabled,
          text: (data?.text || "").trim(),
          bgColor: data?.bgColor || "#000000",
          textColor: data?.textColor || "#ffffff",
        };
        setData(next);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {
          // Depolama kapalıysa yalnız önbellek kullanılmaz.
        }
      } catch {
        // Ağ hatasında eldeki (önbellekteki) duyuru kalır.
        setData((prev) => prev || { enabled: false, text: "" });
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // container ve mesaj genişliklerine göre CSS değişkenlerini ayarla
  useEffect(() => {
    if (!data?.enabled || !data?.text) return;
    const setVars = () => {
      const cw = wrapRef.current?.clientWidth || 0; // container width
      const mw = msgRef.current?.offsetWidth || 0; // message width
      const el = trackRef.current;
      if (!el || !cw || !mw) return;

      el.style.setProperty("--cw", `${cw}px`); // sağdan tam dışarıdan başla
      el.style.setProperty("--mw", `${mw}px`); // sola tam dışarı çık
      // Hız sabit kalsın istersen: süreyi mesafe ile orantıla (opsiyonel)
      const distance = cw + mw; // gidilecek toplam mesafe
      const pxPerSec = 120; // hızı burada ayarlayabilirsin
      const duration = Math.max(4, Math.round(distance / pxPerSec));
      el.style.setProperty("--dur", `${duration}s`);
    };

    setVars();
    // resize’da yeniden ölç
    window.addEventListener("resize", setVars);
    // fontlar/geç yüklenenler için küçük bir tekrar ölçümü
    const t = setTimeout(setVars, 50);
    return () => {
      window.removeEventListener("resize", setVars);
      clearTimeout(t);
    };
  }, [data?.enabled, data?.text]);

  const styles = useMemo(
    () => ({
      backgroundColor: data?.bgColor || "#000000",
      color: data?.textColor || "#ffffff",
    }),
    [data?.bgColor, data?.textColor]
  );

  if (!data && !loaded) {
    // İlk ziyaret: çubuk yüksekliği kadar yer tutulur.
    return (
      <div aria-hidden="true" className="announcement-bar py-2" style={styles}>
        <div className="marquee__track">
          <span className="marquee__msg">&nbsp;</span>
        </div>
      </div>
    );
  }
  if (!data?.enabled || !data?.text) return null;

  return (
    <div
      role="region"
      aria-label="Duyuru"
      className="announcement-bar py-2"
      style={styles}
      ref={wrapRef}
    >
      <div className="marquee__track" ref={trackRef}>
        <span className="marquee__msg" ref={msgRef}>
          {data.text}
        </span>
      </div>
    </div>
  );
}
