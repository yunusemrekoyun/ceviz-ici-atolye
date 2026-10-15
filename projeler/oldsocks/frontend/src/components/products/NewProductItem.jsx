/* eslint-disable no-empty */
import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { FaVolumeMute, FaVolumeUp, FaPlay } from "react-icons/fa";
import { getResponsiveImageProps } from "../../utils/media";
import { toCssColor } from "../../utils/productVariants";
import { formatTry } from "../../utils/currency";

const MOBILE_VIDEO_EVENT = "product-mobile-play";

export default function NewProductItem({
  id,
  video,
  poster,
  name,
  /** normalize: indirim varsa ORİJİNAL, yoksa FINAL */
  price,
  /** normalize: indirim varsa FINAL, yoksa null/undefined */
  discountedPrice,
  /** opsiyonel rozet yüzdesi */
  discountRate,
  stock,
  variantColors,
}) {
  const videoRef = useRef(null);

  // cihaz yetenekleri
  const [isHoverCapable, setIsHoverCapable] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  // Desktop hover / mobil oynat
  const [isHovered, setIsHovered] = useState(false);
  const [mobileWantsPlay, setMobileWantsPlay] = useState(false);
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

  // --- İndirim görünümü (hesap YOK) ---
  const hasDiscount = useMemo(
    () =>
      discountedPrice !== null &&
      discountedPrice !== undefined &&
      Number(discountedPrice) < Number(price),
    [discountedPrice, price]
  );

  const badgeRate = useMemo(() => {
    if (Number(discountRate) > 0) return Math.round(Number(discountRate));
    if (hasDiscount && Number(price) > 0) {
      const pct = Math.round(
        100 - (Number(discountedPrice) / Number(price)) * 100
      );
      return pct > 0 ? pct : 0;
    }
    return 0;
  }, [discountRate, hasDiscount, price, discountedPrice]);

  /* ---------- Desktop (hover) ---------- */
  const handleMouseEnter = () => {
    if (!isHoverCapable) return;
    setIsHovered(true);
    if (videoRef.current && video) {
      videoRef.current.play().catch(() => {});
    }
  };
  const handleMouseLeave = () => {
    if (!isHoverCapable) return;
    setIsHovered(false);
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      } catch {}
    }
  };

  /* ---------- Mobile: “oynat” overlay ---------- */
  const handleMobilePlay = (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent(MOBILE_VIDEO_EVENT, { detail: id }));
    setMobileWantsPlay(true);
    requestAnimationFrame(() => {
      videoRef.current?.play().catch(() => {});
    });
  };
  useEffect(() => {
    const handler = (ev) => {
      if (ev.detail !== id && videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        } catch {}
        setMobileWantsPlay(false);
      }
    };
    window.addEventListener(MOBILE_VIDEO_EVENT, handler);
    return () => window.removeEventListener(MOBILE_VIDEO_EVENT, handler);
  }, [id]);

  useEffect(() => {
    const currentVideoRef = videoRef;
    return () => {
      try {
        currentVideoRef.current?.pause();
      } catch {}
    };
  }, []);

  const toggleMute = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const shouldShowVideo =
    !!video && (isHoverCapable || (isTouch && mobileWantsPlay));
  const posterImage = useMemo(
    () =>
      getResponsiveImageProps(poster, {
        widths: [320, 480, 640, 768],
        defaultWidth: 640,
        sizes:
          "(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 25vw",
        crop: "fill",
        aspectRatio: "3:4",
        gravity: "auto",
      }),
    [poster]
  );

  const colorDots = useMemo(
    () => (Array.isArray(variantColors) ? variantColors : []),
    [variantColors]
  );

  return (
    <Link
      to={`/product-details/${id}`}
      className="group relative flex flex-col rounded-xl overflow-hidden bg-white shadow border border-light2 hover:shadow-xl transition-all duration-300"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Ses butonu — sadece desktop */}
      {shouldShowVideo && isHoverCapable && isHovered && (
        <button
          onClick={toggleMute}
          className="hidden md:flex absolute top-3 right-3 bg-white border border-gray-200 p-1 rounded-full z-10 shadow-md hover:border-purple-500 transition"
          aria-label={isMuted ? "Sesi aç" : "Sesi kapat"}
        >
          {isMuted ? (
            <FaVolumeMute className="text-dark2 text-sm" />
          ) : (
            <FaVolumeUp className="text-purple-600 text-sm" />
          )}
        </button>
      )}

      {/* Medya */}
      <div className="relative w-full aspect-[3/4] bg-light1">
        {/* İndirim Rozeti: mobilde küçük, daha genişte büyür; sol-üst */}
        {hasDiscount && badgeRate > 0 && (
          <div className="absolute top-2 left-2 z-10">
            <div className="bg-red-600 text-white rounded-full shadow-md flex items-center justify-center font-bold w-7 h-7 text-[9px] sm:w-8 sm:h-8 sm:text-[10px] md:w-10 md:h-10 md:text-xs">
              %{badgeRate}
            </div>
          </div>
        )}

        {/* TÜKENDİ — medya alanının sol-altında */}
        {stock === 0 && (
          <div className="absolute bottom-2 left-2 bg-red-600 text-white text-[10px] sm:text-xs px-2 py-1 rounded shadow z-10">
            TÜKENDİ
          </div>
        )}

        {shouldShowVideo ? (
          <video
            ref={videoRef}
            src={video || undefined}
            poster={posterImage.src || undefined}
            muted
            playsInline
            preload={isHoverCapable ? "metadata" : "none"}
            className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-105"
            onLoadedMetadata={() => {
              try {
                if (videoRef.current) videoRef.current.currentTime = 0;
              } catch {}
            }}
          />
        ) : poster ? (
          <img
            src={posterImage.src}
            srcSet={posterImage.srcSet}
            sizes={posterImage.sizes}
            alt={name}
            loading="lazy"
            decoding="async"
            width="640"
            height="853"
            className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.style.background = "#f3f4f6";
              e.currentTarget.src = "";
            }}
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-light1" />
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

        {/* Mobil “oynat” */}
        {isTouch && !!video && !mobileWantsPlay && (
          <button
            onClick={handleMobilePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20"
            aria-label="Videoyu oynat"
          >
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-white/90 shadow">
              <FaPlay className="text-dark2" />
            </span>
          </button>
        )}
      </div>

      {/* İçerik */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="mb-2 line-clamp-2 text-center text-sm font-medium text-dark1">
          {name}
        </h3>

        {hasDiscount ? (
          <div className="mt-auto text-center">
            <div className="text-xs text-gray-500 line-through">
              {formatTry(price)}
            </div>
            {/* İndirimliyse kırmızı */}
            <div className="text-base font-semibold text-red-600">
              {formatTry(discountedPrice)}
            </div>
          </div>
        ) : (
          <p className="mt-auto text-center text-base font-semibold text-dark2">
            {formatTry(price)}
          </p>
        )}
      </div>
    </Link>
  );
}

NewProductItem.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  video: PropTypes.string,
  poster: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  name: PropTypes.string.isRequired,
  // normalize edilmiş pricing props:
  price: PropTypes.number.isRequired,
  discountedPrice: PropTypes.number, // opsiyonel
  discountRate: PropTypes.number, // opsiyonel
  stock: PropTypes.number.isRequired,
  variantColors: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      color: PropTypes.string,
    })
  ),
};

NewProductItem.defaultProps = {
  video: null,
  poster: null,
  discountedPrice: null,
  discountRate: 0,
  variantColors: [],
};
