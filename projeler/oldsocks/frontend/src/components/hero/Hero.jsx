import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { HERO_IMAGE_OPTIONS, loadHeroItems, peekHeroItems } from "../../services/heroMedia";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import { getResponsiveImageProps } from "../../utils/media";
import { useStorefrontSettings } from "../../context/storefrontSettings";
import "swiper/css";
import "swiper/css/pagination";

// Düşük çözünürlüklü medya ekran yüksekliğine büyütülmez. Asıl yükseklik API'den
// biliniyorsa hesap görsel inmeden yapılır; sonradan yükseklik değişip sayfa kaymaz.
function limitFor(naturalHeight) {
  const dpr = window.devicePixelRatio || 1;
  const needPx = Math.round(window.innerHeight * dpr);
  return naturalHeight > 0 && naturalHeight < needPx ? Math.round(naturalHeight / dpr) : null;
}

/** Ortak yükseklik limiti: bilinen yükseklik, yoksa videoHeight || naturalHeight */
function useHeroHeightLimit(elRef, knownHeight) {
  const [pxHeight, setPxHeight] = useState(() => (knownHeight ? limitFor(knownHeight) : null));

  useEffect(() => {
    if (knownHeight) {
      const compute = () => setPxHeight(limitFor(knownHeight));
      compute();
      window.addEventListener("resize", compute);
      return () => window.removeEventListener("resize", compute);
    }
    if (!elRef?.current) return;
    const el = elRef.current;

    function getNaturalHeight(node) {
      // video ise videoHeight, image ise naturalHeight
      return node.videoHeight || node.naturalHeight || 0;
    }

    function compute() {
      const dpr = window.devicePixelRatio || 1;
      const needPx = Math.round(window.innerHeight * dpr);
      const natural = getNaturalHeight(el);

      if (natural > 0 && natural < needPx) {
        const cssPx = Math.round(natural / dpr);
        setPxHeight(cssPx);
      } else {
        setPxHeight(null); // 100vh
      }
    }

    const onMetaOrLoad = () => compute();

    // video -> loadedmetadata, image -> load
    el.addEventListener("loadedmetadata", onMetaOrLoad);
    el.addEventListener("load", onMetaOrLoad);
    window.addEventListener("resize", compute);

    // İlk deneme (bazı tarayıcılarda event gecikebilir)
    setTimeout(compute, 0);

    return () => {
      el.removeEventListener("loadedmetadata", onMetaOrLoad);
      el.removeEventListener("load", onMetaOrLoad);
      window.removeEventListener("resize", compute);
    };
  }, [elRef, knownHeight]);

  return pxHeight;
}

export default function Hero() {
  const { heroButtonOpacity = 30 } = useStorefrontSettings();
  const buttonOpacity = Math.max(0, Math.min(100, heroButtonOpacity)) / 100;
  const [items, setItems] = useState(peekHeroItems); // null: yükleniyor
  const singleRef = useRef(null);
  const singleHeightPx = useHeroHeightLimit(
    singleRef,
    items?.length === 1 ? Number(items[0]?.media?.height) || 0 : 0
  );

  useEffect(() => {
    let alive = true;
    loadHeroItems()
      .then((data) => alive && setItems(data))
      .catch((err) => {
        console.error("Hero media alınamadı:", err);
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Veri gelene kadar yer ayrılır; sonradan tam ekran bir bölüm eklenip sayfayı itmez.
  if (items === null) {
    return <section aria-hidden="true" className="relative w-full h-[100vh] bg-light1" />;
  }
  if (!items.length) return null;

  const renderMedia = (item, refIfSingle = null, index = 0) => {
    if (item.kind === "image") {
      const imageProps = getResponsiveImageProps(item.media || item.url, HERO_IMAGE_OPTIONS);
      // Yalnız ilk slayt öncelikli; diğerleri sırası gelince iner.
      const first = index === 0;

      return (
        <img
          ref={refIfSingle || null}
          src={imageProps.src}
          srcSet={imageProps.srcSet}
          sizes={imageProps.sizes}
          alt="OLDSOCKS"
          loading={first ? "eager" : "lazy"}
          fetchpriority={first ? "high" : "low"}
          decoding={first ? "sync" : "async"}
          className="w-full h-full object-cover object-center block"
        />
      );
    }
    const mobileVideo = item.media?.videos?.find((source) => source.name === "mobile");
    const desktopVideo =
      item.media?.videos?.find((source) => source.name === "desktop") ||
      item.media?.videos?.find((source) => source.name === "detail");
    const poster =
      item.media?.posters?.find((source) => source.name === "poster-desktop")?.url ||
      item.media?.posters?.[0]?.url;
    return (
      <video
        ref={refIfSingle || null}
        src={!mobileVideo && !desktopVideo ? item.url : undefined}
        poster={poster}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="w-full h-full object-cover object-center block"
      >
        {mobileVideo && (
          <source
            src={mobileVideo.url}
            type={mobileVideo.mime || "video/mp4"}
            media="(max-width: 767px)"
          />
        )}
        {desktopVideo && (
          <source src={desktopVideo.url} type={desktopVideo.mime || "video/mp4"} />
        )}
      </video>
    );
  };

  // Tek medya
  if (items.length === 1) {
    const style =
      singleHeightPx != null
        ? { height: `${singleHeightPx}px` }
        : { height: "100vh" };

    return (
      <section className="relative w-full overflow-hidden" style={style}>
        {renderMedia(items[0], singleRef)}

        {/* CTA */}
        <Link
          to="/shop"
          className="hero-cta absolute bottom-16 left-1/2 -translate-x-1/2 px-6 py-3 text-white border border-white rounded-full backdrop-blur-sm transition z-20"
          style={{ "--button-opacity": buttonOpacity }}
        >
          Alışverişe Başla
        </Link>
      </section>
    );
  }

  // 2+ medya -> slider
  return (
    <section className="relative w-full h-[100vh] overflow-hidden">
      {/* Sonsuz döngü: son banner'dan sonra ilkine kesintisiz geçer (en az 3 banner gerekir). */}
      <Swiper
        modules={[Autoplay, Pagination]}
        loop={items.length >= 3}
        rewind={items.length < 3}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        className="w-full h-full"
      >
        {items.map((it, index) => (
          <SwiperSlide key={it._id} className="!flex">
            {renderMedia(it, null, index)}
          </SwiperSlide>
        ))}
      </Swiper>

      {/* CTA */}
      <Link
        to="/shop"
        className="hero-cta absolute bottom-16 left-1/2 -translate-x-1/2 px-6 py-3 text-white border border-white rounded-full backdrop-blur-sm transition z-20"
        style={{ "--button-opacity": buttonOpacity }}
      >
        Alışverişe Başla
      </Link>

      {/* Pagination stilleri */}
      <style jsx="true">{`
        .swiper-pagination {
          position: absolute;
          bottom: 20px;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 10px;
          z-index: 20;
        }
        .swiper-pagination-bullet {
          width: 12px;
          height: 12px;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 9999px;
          opacity: 1;
          transition: background 0.3s ease;
        }
        .swiper-pagination-bullet-active {
          background: white;
          box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </section>
  );
}
