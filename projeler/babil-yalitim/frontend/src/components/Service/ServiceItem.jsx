// src/components/Service/ServiceItem.jsx
import PropTypes from "prop-types";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AdaptiveImage from "../Media/AdaptiveImage";
import {
  getOptimizedImageUrl,
  getOptimizedVideoUrl,
  getVideoPosterUrl,
  looksVideo,
} from "../../utils/media";
import { usePerformanceProfile } from "../../performance/PerformanceProvider";
import useViewportActivation from "../../hooks/useViewportActivation";
import { useLocale } from "../../i18n/LocaleContext";
import { localizePath } from "../../i18n/routing.js";

const pickFirstImageAndVideo = (images = []) => {
  let img = null;
  let vid = null;

  for (const media of images) {
    const url = media?.url;
    if (!url) continue;

    const isImage =
      media?.resourceType === "image" ||
      (!media?.resourceType && !looksVideo(url));
    const isVideo =
      media?.resourceType === "video" ||
      (!media?.resourceType && looksVideo(url));

    if (isImage && !img) img = media;
    if (isVideo && !vid) vid = media;
    if (img && vid) break;
  }

  return { img, vid };
};

const ServiceItem = ({ service, priority = false }) => {
  const { locale } = useLocale();
  const [hovered, setHovered] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef(null);
  const [cardRef, inView] = useViewportActivation({
    once: false,
    rootMargin: "140px 0px",
  });
  const {
    cardImageWidth,
    imageQuality,
    isTouch,
    saveData,
    prefersReducedMotion,
  } = usePerformanceProfile();

  const { isVideo, imageMedia, videoMedia, posterMedia } = useMemo(() => {
    const cover = service?.cover || null;
    const coverUrl = cover?.url || service?.imageDataUrl || service?.imageUrl || "";
    const coverIsVideo =
      cover?.resourceType === "video" || looksVideo(coverUrl);
    const images = Array.isArray(service?.images) ? service.images : [];
    const { img: firstImage, vid: firstVideo } = pickFirstImageAndVideo(images);
    const videoMedia = coverIsVideo ? cover || coverUrl : firstVideo || null;
    const imageMedia =
      (!coverIsVideo && (cover || coverUrl)) ||
      firstImage ||
      cover ||
      service?.imageDataUrl ||
      service?.imageUrl ||
      null;
    const posterMedia = imageMedia || videoMedia || null;

    return {
      isVideo: Boolean(videoMedia),
      imageMedia,
      videoMedia,
      posterMedia,
    };
  }, [service]);

  const optimizedCoverUrl = useMemo(
    () =>
      isVideo
        ? getOptimizedVideoUrl(videoMedia, {
            width: cardImageWidth,
            purpose: "preview",
          })
        : "",
    [cardImageWidth, isVideo, videoMedia]
  );

  const posterUrl = useMemo(() => {
    if (!posterMedia) return "";

    if (posterMedia?.resourceType === "video") {
      return getVideoPosterUrl(posterMedia, {
        width: cardImageWidth,
        quality: imageQuality,
      });
    }

    return getOptimizedImageUrl(posterMedia, {
      width: cardImageWidth,
      quality: imageQuality,
      fallbackSrc: service?.imageDataUrl || service?.imageUrl || "",
    });
  }, [
    cardImageWidth,
    imageQuality,
    posterMedia,
    service?.imageDataUrl,
    service?.imageUrl,
  ]);

  const fallbackPosterUrl = useMemo(() => {
    if (posterUrl) return posterUrl;
    if (!isVideo || !videoMedia) return "";

    return getVideoPosterUrl(videoMedia, {
      width: cardImageWidth,
      quality: imageQuality,
    });
  }, [cardImageWidth, imageQuality, isVideo, posterUrl, videoMedia]);

  const shouldPlay =
    isVideo &&
    !saveData &&
    !prefersReducedMotion &&
    (isTouch ? inView : hovered);

  useEffect(() => {
    setVideoReady(false);
  }, [optimizedCoverUrl, service?._id]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (shouldPlay) {
      v.play().catch(() => {});
      return;
    }

    v.pause();
    v.currentTime = 0;
  }, [shouldPlay]);

  const handleEnter = () => {
    setHovered(true);
  };

  const handleLeave = () => {
    setHovered(false);
  };

  return (
    <div ref={cardRef}>
      <Link
        to={
          service?._id
            ? localizePath(`/services/${service._id}`, locale)
            : "#"
        }
        state={service?._id ? { title: service?.title || "", service } : undefined}
        className="transform-gpu-soft group block overflow-hidden rounded-3xl border border-white/50 bg-white/60 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] hover:shadow-[0_18px_50px_rgba(0,0,0,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-quaternaryColor/60 transition-shadow"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        aria-label={`${service?.title || (locale === "en" ? "Service" : "Hizmet")} ${
          locale === "en" ? "view details" : "detayına git"
        }`}
      >
        {/* Media: 9:16 */}
        <div className="relative aspect-[9/16] overflow-hidden">
          {isVideo ? (
            <>
              {fallbackPosterUrl ? (
                <img
                  src={fallbackPosterUrl}
                  alt={service?.title || (locale === "en" ? "Service preview" : "Hizmet önizleme")}
                  className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ${
                    hovered || (isTouch && inView) ? "scale-105" : "scale-100"
                  } ${videoReady ? "opacity-0" : "opacity-100"}`}
                  loading={priority ? "eager" : "lazy"}
                  {...(priority ? { fetchpriority: "high" } : {})}
                  decoding="async"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-gray-200 to-gray-300" />
              )}
              <video
                ref={videoRef}
                src={optimizedCoverUrl}
                muted
                loop
                playsInline
                poster={fallbackPosterUrl || undefined}
                preload={priority || inView ? "metadata" : "none"}
                className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ${
                  hovered || (isTouch && inView) ? "scale-105" : "scale-100"
                } ${videoReady ? "opacity-100" : "opacity-0"}`}
                onCanPlay={() => setVideoReady(true)}
                onLoadedData={() => setVideoReady(true)}
                onError={() => setVideoReady(false)}
              />
            </>
          ) : imageMedia ? (
            <AdaptiveImage
              media={imageMedia}
              alt={service?.title || (locale === "en" ? "service" : "hizmet")}
              className={`h-full w-full object-cover transition-transform duration-700 ${
                hovered || (isTouch && inView) ? "scale-105" : "scale-100"
              }`}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 80vw"
              widths={[320, 480, 640, 800, 960]}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : undefined}
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-b from-gray-200 to-gray-300" />
          )}

          {/* üstten parlama + altta gradient */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <div className="pointer-events-none absolute -inset-y-10 -left-24 w-40 rotate-12 bg-white/25 blur-2xl transition-all duration-700 group-hover:translate-x-[140%]" />

          {/* Başlık + tip/kategori */}
          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h3 className="text-lg font-semibold drop-shadow-sm">
              {service?.title || (locale === "en" ? "Service" : "Hizmet")}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {service?.type && (
                <span className="text-[11px] px-2 py-1 rounded-full bg-white/20 border border-white/30 backdrop-blur">
                  {service.type}
                </span>
              )}
              {service?.category && (
                <span className="text-[11px] px-2 py-1 rounded-full bg-white/20 border border-white/30 backdrop-blur">
                  {service.category}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Alt içerik */}
        <div className="p-4">
          {service?.description && (
            <p
              className="text-sm text-gray-700"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
              title={service.description}
            >
              {service.description}
            </p>
          )}

          {Array.isArray(service?.usageAreas) &&
            service.usageAreas.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {service.usageAreas.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200"
                  >
                    {t}
                  </span>
                ))}
                {service.usageAreas.length > 4 && (
                  <span className="text-[11px] text-gray-400">
                    +{service.usageAreas.length - 4}
                  </span>
                )}
              </div>
            )}
        </div>
      </Link>
    </div>
  );
};

ServiceItem.propTypes = {
  service: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    type: PropTypes.string,
    category: PropTypes.string,
    usageAreas: PropTypes.arrayOf(PropTypes.string),
    description: PropTypes.string,
    cover: PropTypes.shape({
      url: PropTypes.string,
      storageKey: PropTypes.string,
      posterUrl: PropTypes.string,
      resourceType: PropTypes.string, // "image" | "video"
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
    galleryDataUrls: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  priority: PropTypes.bool,
};

export default ServiceItem;
