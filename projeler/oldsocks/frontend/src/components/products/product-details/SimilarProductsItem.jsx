// src/components/products/SimilarProductItem.jsx
/* eslint-disable no-empty */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { FaVolumeMute, FaVolumeUp, FaPlay } from "react-icons/fa";
import { getResponsiveImageProps } from "../../../utils/media";
import { toCssColor } from "../../../utils/productVariants";
import { formatTry } from "../../../utils/currency";

const MOBILE_VIDEO_EVENT = "product-mobile-play";

export default function SimilarProductItem({
  id,
  video,
  poster,
  name,
  price,
  discountedPrice,
  stock, // opsiyonel: 0 ise "TÜKENDİ" göster
  variantColors,
}) {
  const videoRef = useRef(null);

  // Cihaz yetenekleri
  const [isHoverCapable, setIsHoverCapable] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  // Desktop: hover; Mobil: kullanıcı “oynat”a bastı mı?
  const [isHovered, setIsHovered] = useState(false);
  const [mobileWantsPlay, setMobileWantsPlay] = useState(false);

  // Ses (yalnız desktop’ta ikon)
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hoverQuery =
        window.matchMedia &&
        window.matchMedia("(hover: hover)").matches === true;
      const touchCapable =
        "ontouchstart" in window ||
        (typeof navigator !== "undefined" &&
          Number(navigator.maxTouchPoints) > 0);

      setIsHoverCapable(hoverQuery);
      setIsTouch(touchCapable);
    }
  }, []);

  // İndirim var mı?
  const hasDiscount =
    typeof discountedPrice === "number" && discountedPrice < price;

  const pct = useMemo(() => {
    if (!hasDiscount) return 0;
    const val = Math.round(100 - (discountedPrice / price) * 100);
    return Math.max(1, val);
  }, [hasDiscount, discountedPrice, price]);

  /* ---------- Desktop (hover) ---------- */
  const onEnter = () => {
    if (!isHoverCapable) return;
    setIsHovered(true);
    if (videoRef.current && video) {
      videoRef.current
        .play()
        .catch((e) => console.debug("Video play blocked (hover):", e?.message));
    }
  };

  const onLeave = () => {
    if (!isHoverCapable) return;
    setIsHovered(false);
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } catch (e) {
        console.debug("Video reset error:", e?.message);
      }
    }
  };

  /* ---------- Mobil: “oynat” ---------- */
  const handleMobilePlay = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent(MOBILE_VIDEO_EVENT, { detail: id }));
    setMobileWantsPlay(true);
    requestAnimationFrame(() => {
      videoRef.current?.play().catch(() => {});
    });
  };

  // Başka kart oynarsa bunu durdur
  useEffect(() => {
    const handler = (ev) => {
      if (ev.detail !== id && videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        } catch (err) {
          console.debug("Pause/reset on external event failed:", err?.message);
        }
        setMobileWantsPlay(false);
      }
    };
    window.addEventListener(MOBILE_VIDEO_EVENT, handler);
    return () => window.removeEventListener(MOBILE_VIDEO_EVENT, handler);
  }, [id]);

  // Unmount’ta durdur
  useEffect(() => {
    const currentVideoRef = videoRef;
    return () => {
      try {
        currentVideoRef.current?.pause();
      } catch {}
    };
  }, []);

  /* ---------- Ses toggle (sadece desktop) ---------- */
  const toggleMute = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  // Ne gösterelim?
  const shouldShowVideo =
    !!video && (isHoverCapable || (isTouch && mobileWantsPlay));
  const posterImage = useMemo(
    () =>
      getResponsiveImageProps(poster, {
        widths: [240, 320, 480, 640],
        defaultWidth: 480,
        sizes: "(max-width: 640px) 50vw, 25vw",
        crop: "fill",
        aspectRatio: "3:4",
        gravity: "auto",
      }),
    [poster]
  );

  const colorDots = Array.isArray(variantColors) ? variantColors : [];

  return (
    <Link
      to={`/product-details/${id}`}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      className="group relative rounded-2xl overflow-hidden bg-white shadow-md hover:shadow-xl border border-light2 transition-all duration-300 flex flex-col h-full select-none"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Görsel/Video Alanı */}
      <div className="relative h-64 overflow-hidden bg-light1">
        {/* İndirim Rozeti: sol-üst, mobilde küçük; breakpoint'lerde kademeli büyür */}
        {hasDiscount && (
          <span className="absolute top-2 left-2 z-10 inline-flex items-center justify-center rounded-full bg-red-600 text-white font-bold shadow w-7 h-7 text-[9px] sm:w-8 sm:h-8 sm:text-[10px] md:w-10 md:h-10 md:text-xs">
            -{pct}%
          </span>
        )}

        {/* TÜKENDİ — medya alanının sol-altında (opsiyonel stock=0) */}
        {typeof stock !== "undefined" && stock === 0 && (
          <span className="absolute bottom-2 left-2 z-10 inline-flex items-center justify-center px-2 py-1 rounded bg-red-600 text-white text-[10px] sm:text-xs shadow">
            TÜKENDİ
          </span>
        )}

        {shouldShowVideo ? (
          <video
            ref={videoRef}
            src={video || undefined}
            poster={posterImage.src || undefined}
            muted
            playsInline
            preload={isHoverCapable ? "metadata" : "none"}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onLoadedMetadata={() => {
              try {
                if (videoRef.current) videoRef.current.currentTime = 0;
              } catch (e) {
                console.debug("onLoadedMetadata reset failed:", e?.message);
              }
            }}
          />
        ) : (
          <img
            src={posterImage.src || ""}
            srcSet={posterImage.srcSet}
            sizes={posterImage.sizes}
            alt={name}
            loading="lazy"
            decoding="async"
            width="480"
            height="640"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
              e.currentTarget.src = "";
            }}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
          />
        )}

        {/* Ses butonu — sadece desktop + hover sırasında */}
        {shouldShowVideo && isHoverCapable && isHovered && (
          <button
            onClick={toggleMute}
            className="hidden md:flex absolute top-2 right-2 bg-white/90 p-2 rounded-full shadow-md z-10 hover:scale-110 transition"
            aria-label={isMuted ? "Sesi aç" : "Sesi kapat"}
          >
            {isMuted ? (
              <FaVolumeMute className="text-dark2" />
            ) : (
              <FaVolumeUp className="text-dark2" />
            )}
          </button>
        )}

        {/* Mobil “oynat” katmanı */}
        {isTouch && !!video && !mobileWantsPlay && (
          <button
            onClick={handleMobilePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20"
            aria-label="Videoyu oynat"
          >
            <span className="flex items-center justify-center w-11 h-11 rounded-full bg-white/90 shadow">
              <FaPlay className="text-dark2" />
            </span>
          </button>
        )}

        {/* ► DİKEY RENK NOKTALARI */}
        {colorDots.length > 0 ? (
          <div className="absolute bottom-2 right-2 z-10 pointer-events-none flex flex-col gap-1">
            {colorDots.map((v) => (
              <span
                key={v._id}
                className="inline-block w-2.5 h-2.5 rounded-full border shadow-sm"
                style={{
                  background: toCssColor(v.color),
                  borderColor: "rgba(255,255,255,.95)",
                }}
                title={v.color}
                aria-label={v.color}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* İçerik */}
      <div className="flex flex-col justify-between flex-grow p-4 space-y-2">
        <h4 className="text-dark1 text-sm font-semibold leading-snug line-clamp-2 text-center">
          {name}
        </h4>
        {hasDiscount ? (
          <div className="text-center">
            <p className="text-xs text-gray-500 line-through">
              {formatTry(price)}
            </p>
            <p className="text-sm font-bold text-red-600">
              {formatTry(discountedPrice)}
            </p>
          </div>
        ) : (
          <p className="text-dark1 font-bold text-sm text-center mt-1">
            {formatTry(price)}
          </p>
        )}
      </div>
    </Link>
  );
}

SimilarProductItem.propTypes = {
  id: PropTypes.string.isRequired,
  video: PropTypes.string,
  poster: PropTypes.oneOfType([PropTypes.string, PropTypes.object]), // opsiyonel
  name: PropTypes.string.isRequired,
  price: PropTypes.number.isRequired,
  discountedPrice: PropTypes.number,
  stock: PropTypes.number, // opsiyonel
  variantColors: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      color: PropTypes.string,
    })
  ),
};

SimilarProductItem.defaultProps = {
  video: null,
  stock: undefined,
  variantColors: [],
};
