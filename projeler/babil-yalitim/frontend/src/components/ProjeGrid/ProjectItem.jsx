// src/components/ProjeGrid/ProjectItem.jsx
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { PlayCircle, PauseCircle } from "lucide-react";
import AdaptiveImage from "../Media/AdaptiveImage";
import {
  getOptimizedVideoUrl,
  getVideoPosterUrl,
  looksVideo,
} from "../../utils/media";
import { usePerformanceProfile } from "../../performance/PerformanceProvider";
import { useLocale } from "../../i18n/LocaleContext";
import { localizePath } from "../../i18n/routing.js";

const clamp2 = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const fmt = (v, locale) =>
  v ? new Date(v).toLocaleDateString(locale === "en" ? "en-GB" : "tr-TR") : null;

// En iyi poster’i seç: gerçek görsel → kapak video poster → opsiyonel video poster → legacy
const pickPosterAndVideo = (project, cardImageWidth, imageQuality) => {
  const cover = project?.cover || null;
  const images = Array.isArray(project?.images) ? project.images : [];
  const optVideo = project?.video || null;

  const coverUrl = cover?.url || "";
  const firstImage = images.find((m) => {
    const u = m?.url;
    return u && (m?.resourceType === "image" || (!m?.resourceType && !looksVideo(u)));
  })?.url;

  const legacyImg =
    project?.imageUrl ||
    project?.imageDataUrl ||
    (Array.isArray(project?.galleryDataUrls) && project.galleryDataUrls[0]) ||
    "";

  const coverIsVideo = cover?.resourceType === "video" || looksVideo(coverUrl);
  const optVideoUrl = optVideo?.url || "";

  const posterFromCoverVideo = coverIsVideo
    ? getVideoPosterUrl(cover, {
        width: cardImageWidth,
        quality: imageQuality,
      })
    : null;
  const posterFromOptVideo = optVideoUrl
    ? getVideoPosterUrl(optVideo, {
        width: cardImageWidth,
        quality: imageQuality,
      })
    : null;

  const poster =
    // 1) gerçek görsel
    firstImage ||
    (!coverIsVideo && coverUrl) ||
    // 2) kapak video thumb
    posterFromCoverVideo ||
    // 3) opsiyonel video thumb
    posterFromOptVideo ||
    // 4) legacy/fallback
    legacyImg ||
    "";

  // Video önceliği: kapak video varsa onu kullan; yoksa opsiyonel video
  const video = coverIsVideo ? cover || coverUrl : optVideo || optVideoUrl;

  return { poster, video };
};

/* ---------------- Event: aynı anda tek video ---------------- */
const GRID_PLAY_EVENT = "grid:video-play"; // detail: { id: string }

const ProjectItem = ({ project, index }) => {
  const { locale } = useLocale();
  const [hovered, setHovered] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  const videoRef = useRef(null);
  const selfId = useRef(project?._id || String(index));
  const { cardImageWidth, imageQuality } = usePerformanceProfile();

  // touch cihaz (mobil/tablet)
  const isTouch = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  }, []);

  const { poster, video } = useMemo(
    () => pickPosterAndVideo(project, cardImageWidth, imageQuality),
    [cardImageWidth, imageQuality, project]
  );
  const videoUrl = useMemo(
    () =>
      getOptimizedVideoUrl(video, {
        width: cardImageWidth,
        purpose: "preview",
      }),
    [cardImageWidth, video]
  );
  const hasImage = Boolean(poster);

  // Mobil: video'yu dokunana kadar mount etme
  const [mountedVideo, setMountedVideo] = useState(false);
  const [isPlayingTouch, setIsPlayingTouch] = useState(false);

  // Desktop hover davranışı (sadece görsel yoksa video oynatmayı dene)
  const onEnter = () => {
    setHovered(true);
    if (!isTouch && !hasImage && videoUrl && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };
  const onLeave = () => {
    setHovered(false);
    if (!isTouch && videoRef.current) videoRef.current.pause();
  };

  // Başka kart play ederse durdur
  useEffect(() => {
    const handler = (e) => {
      const otherId = e?.detail?.id;
      if (!otherId || otherId === selfId.current) return;
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
        setIsPlayingTouch(false);
      }
    };
    window.addEventListener(GRID_PLAY_EVENT, handler);
    return () => window.removeEventListener(GRID_PLAY_EVENT, handler);
  }, []);

  // Mobil: köşe play/pause
  const onTouchPlayToggle = (e) => {
    if (!isTouch) return;
    if (!videoUrl) return;
    e.preventDefault();
    e.stopPropagation();

    if (!mountedVideo) {
      setMountedVideo(true);
      queueMicrotask(async () => {
        if (!videoRef.current) return;
        try {
          window.dispatchEvent(
            new CustomEvent(GRID_PLAY_EVENT, { detail: { id: selfId.current } })
          );
          await videoRef.current.play();
          setIsPlayingTouch(true);
        } catch {
          setIsPlayingTouch(false);
        }
      });
      return;
    }

    if (videoRef.current) {
      if (videoRef.current.paused) {
        window.dispatchEvent(
          new CustomEvent(GRID_PLAY_EVENT, { detail: { id: selfId.current } })
        );
        videoRef.current
          .play()
          .then(() => setIsPlayingTouch(true))
          .catch(() => setIsPlayingTouch(false));
      } else {
        videoRef.current.pause();
        setIsPlayingTouch(false);
      }
    }
  };

  return (
    <motion.article
      className="transform-gpu-soft relative overflow-hidden rounded-2xl border border-white/40 bg-white/30 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] group"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.45 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <Link to={localizePath(`/project-detail/${project._id}`, locale)} className="block">
        <div className="relative h-56 md:h-64 overflow-hidden">
          {/* Poster: her zaman render; mobilde video mount olunca silinir */}
          {hasImage && imgOk && (
            <AdaptiveImage
              media={poster}
              alt={project?.title || (locale === "en" ? "Project" : "Proje")}
              className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${
                hovered ? "scale-110" : "scale-100"
              } ${isTouch && mountedVideo ? "opacity-0" : "opacity-100"}`}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              widths={[320, 480, 640, 800, 960]}
              onError={() => setImgOk(false)}
            />
          )}

          {/* Desktop: görsel yoksa video hazır; hover'da play */}
          {!isTouch && !hasImage && videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              muted
              loop
              playsInline
              preload="none"
              poster={hasImage ? poster : undefined}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}

          {/* Mobil/touch: autoplay yok; kullanıcı isteyince mount edilen video */}
          {isTouch && mountedVideo && videoUrl && (
            <video
              ref={videoRef}
              src={videoUrl}
              muted
              playsInline
              preload="none"
              poster={hasImage ? poster : undefined}
              className="absolute inset-0 w-full h-full object-cover"
              onPlay={() => setIsPlayingTouch(true)}
              onPause={() => setIsPlayingTouch(false)}
              onEnded={() => setIsPlayingTouch(false)}
            />
          )}

          {/* Üst efektler */}
          <div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-opacity duration-500 ${
              hovered ? "opacity-100" : "opacity-90"
            }`}
          />
          <div
            className={`pointer-events-none absolute -inset-y-10 -left-24 w-40 rotate-12 bg-white/25 blur-2xl transition-all duration-700 ${
              hovered ? "translate-x-[140%]" : "translate-x-0"
            }`}
          />

          {/* Mobil/touch: sağ-alt küçük play/pause */}
          {isTouch && videoUrl && (
            <button
              type="button"
              onClick={onTouchPlayToggle}
              className="absolute bottom-2 right-2 z-20 rounded-full bg-black/45 p-1.5 backdrop-blur-sm active:bg-black/55 text-white"
              aria-label={
                isPlayingTouch
                  ? locale === "en"
                    ? "Pause video"
                    : "Videoyu durdur"
                  : locale === "en"
                  ? "Play video"
                  : "Videoyu oynat"
              }
            >
              {isPlayingTouch ? <PauseCircle size={26} /> : <PlayCircle size={26} />}
            </button>
          )}
        </div>

        <div className="p-5">
          <h3 className="text-lg md:text-xl font-semibold text-brandBlue">
            {project?.title}
          </h3>

          {project?.category && (
            <span className="inline-block mt-2 text-xs px-2 py-1 rounded-full bg-quaternaryColor/10 text-quaternaryColor border border-quaternaryColor/30">
              {project.category}
            </span>
          )}

          {project?.description && (
            <p
              className="mt-3 text-sm text-gray-700"
              style={clamp2}
              title={project.description}
            >
              {project.description}
            </p>
          )}

          {(project?.startDate ||
            project?.endDate ||
            project?.completedAt ||
            project?.durationDays) && (
            <p className="mt-3 text-xs text-gray-500 space-x-2">
              {project.startDate && (
                <span>{locale === "en" ? "Start:" : "Başlangıç:"} {fmt(project.startDate, locale)}</span>
              )}
              {project.endDate && <span>{locale === "en" ? "End:" : "Bitiş:"} {fmt(project.endDate, locale)}</span>}
              {project.completedAt && (
                <span>{locale === "en" ? "Completed:" : "Tamamlandı:"} {fmt(project.completedAt, locale)}</span>
              )}
              {project.durationDays ? (
                <span>({project.durationDays} {locale === "en" ? "days" : "gün"})</span>
              ) : null}
            </p>
          )}
        </div>
      </Link>
    </motion.article>
  );
};

ProjectItem.propTypes = {
  project: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
};

export default ProjectItem;
