import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getOptimizedImageUrl,
  getOptimizedVideoUrl,
  getVideoPosterUrl,
  looksVideo,
} from "../../utils/media";
import { usePerformanceProfile } from "../../performance/PerformanceProvider";
import { useLocale } from "../../i18n/LocaleContext";
import { localizePath } from "../../i18n/routing.js";

const pickFirstImageAndVideo = (images = []) => {
  let img = null;
  let vid = null;
  for (const m of images) {
    const url = m?.url;
    if (!url) continue;
    const isImg =
      m?.resourceType === "image" || (!m?.resourceType && !looksVideo(url));
    const isVid =
      m?.resourceType === "video" || (!m?.resourceType && looksVideo(url));
    if (isImg && !img) img = m;
    if (isVid && !vid) vid = m;
    if (img && vid) break;
  }
  return { img, vid };
};

const ServiceGridItem = ({
  item,
  isCenter,
  isNeighbor = false,
  shouldAutoplay,
  registerVideoRef,
  detailState,
  priority = false,
}) => {
  const { locale } = useLocale();
  const videoRef = useRef(null);
  const [videoReady, setVideoReady] = useState(false);
  const {
    cardImageWidth,
    imageQuality,
    saveData,
    prefersReducedMotion,
  } = usePerformanceProfile();

  const cover = item?.cover || null;
  const imagesArr = Array.isArray(item?.images) ? item.images : [];
  const { img: firstImage, vid: firstVideo } = pickFirstImageAndVideo(imagesArr);

  const coverIsVideo =
    cover?.resourceType === "video" || looksVideo(cover?.url);

  const videoMedia = coverIsVideo ? cover || cover?.url : firstVideo || null;
  const videoUrl = useMemo(
    () =>
      getOptimizedVideoUrl(videoMedia, {
        width: cardImageWidth,
        purpose: "preview",
      }),
    [cardImageWidth, videoMedia]
  );

  const previewMedia = (!coverIsVideo && (cover || cover?.url)) || firstImage || null;
  const posterUrl = useMemo(() => {
    if (previewMedia) {
      return getOptimizedImageUrl(previewMedia, {
        width: cardImageWidth,
        quality: imageQuality,
        fallbackSrc: item?.imageDataUrl || item?.imageUrl || "",
      });
    }

    if (videoMedia) {
      return getVideoPosterUrl(videoMedia, {
        width: cardImageWidth,
        quality: imageQuality,
      });
    }

    return item?.imageDataUrl || item?.imageUrl || "";
  }, [cardImageWidth, imageQuality, item?.imageDataUrl, item?.imageUrl, previewMedia, videoMedia]);

  const size =
    "w-[84vw] max-w-[22rem] h-[25rem] sm:w-[320px] sm:h-[480px] object-cover rounded-[22px] shadow-lg";

  const autoplayAllowed = !saveData && !prefersReducedMotion;
  // Hemen yanindaki kartlar da metadata cekiyor. Aksi halde her kaydirmada
  // video sifirdan indirilmeye basliyor ve merkeze gelen kart bos kaliyor.
  const preloadMode =
    isCenter && autoplayAllowed
      ? "auto"
      : isCenter || isNeighbor
        ? "metadata"
        : "none";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isCenter && shouldAutoplay && autoplayAllowed) {
      video.play().catch(() => {});
      return;
    }

    video.pause();
    video.currentTime = 0;
  }, [autoplayAllowed, isCenter, shouldAutoplay]);

  useEffect(() => {
    setVideoReady(false);
  }, [videoUrl, item?._id]);

  return (
    <Link
      to={item?._id ? localizePath(`/services/${item._id}`, locale) : "#"}
      state={detailState || (item?._id ? { title: item?.title || "", service: item } : undefined)}
      className="relative block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-2xl"
      aria-label={`${item?.title || (locale === "en" ? "Service" : "Hizmet")} ${
        locale === "en" ? "view details" : "detayına git"
      }`}
    >
      {/* Merkez kart: poster her zaman görünür, video hazır olunca üzerine akar */}
      {isCenter && videoUrl ? (
        <div className={`relative overflow-hidden ${size}`}>
          {posterUrl ? (
            <img
              {...{ fetchpriority: "high" }}
              src={posterUrl}
              alt={item?.title || (locale === "en" ? "Service preview" : "Hizmet önizleme")}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
                videoReady ? "opacity-0" : "opacity-100"
              }`}
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="absolute inset-0 bg-slate-200" />
          )}
          <video
            ref={(el) => {
              if (registerVideoRef) registerVideoRef(el);
              videoRef.current = el;
            }}
            src={videoUrl}
            muted
            loop
            playsInline
            poster={posterUrl || undefined}
            autoPlay={autoplayAllowed && shouldAutoplay}
            preload={preloadMode}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
              videoReady ? "opacity-100" : "opacity-0"
            }`}
            onCanPlay={() => setVideoReady(true)}
            onLoadedData={() => setVideoReady(true)}
            onPause={() => {
              if (!shouldAutoplay) setVideoReady(false);
            }}
            onError={(e) => {
              setVideoReady(false);
              console.error(
                "[ServiceGridItem] video load ERROR",
                { id: item?._id, title: item?.title },
                "src:",
                e.currentTarget?.currentSrc || e.currentTarget?.src
              );
            }}
          />
        </div>
      ) : posterUrl ? (
        <img
          src={posterUrl}
          alt={item?.title || (locale === "en" ? "Service" : "Hizmet")}
          className={size}
          loading={priority ? "eager" : "lazy"}
          {...(priority ? { fetchpriority: "high" } : {})}
          decoding="async"
        />
      ) : (
        <div className={`${size} bg-white/10 border border-white/20`} />
      )}

      {/* Overlay sadece merkezde */}
      {isCenter && (
        <div className="absolute inset-0 bg-black/35 flex flex-col justify-end p-4 rounded-[22px]">
          <p className="text-white text-lg font-semibold mb-1 text-left">
            {item?.title}
          </p>
          {item?.type && (
            <span className="self-start inline-block text-[11px] px-2 py-1 rounded-full bg-white/20 border border-white/30 backdrop-blur">
              {item.type}
            </span>
          )}
        </div>
      )}
    </Link>
  );
};

ServiceGridItem.propTypes = {
  item: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    type: PropTypes.string,
    cover: PropTypes.shape({
      url: PropTypes.string,
      storageKey: PropTypes.string,
      posterUrl: PropTypes.string,
      resourceType: PropTypes.string,
    }),
    images: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        storageKey: PropTypes.string,
        posterUrl: PropTypes.string,
        resourceType: PropTypes.string,
      })
    ),
    imageDataUrl: PropTypes.string,
    imageUrl: PropTypes.string,
  }),
  isCenter: PropTypes.bool,
  isNeighbor: PropTypes.bool,
  shouldAutoplay: PropTypes.bool,
  registerVideoRef: PropTypes.func,
  detailState: PropTypes.object,
  priority: PropTypes.bool,
};

export default ServiceGridItem;
