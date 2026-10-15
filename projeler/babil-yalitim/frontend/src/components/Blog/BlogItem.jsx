// src/components/Blog/BlogItem.jsx
import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { PlayCircle } from "lucide-react";
import AdaptiveImage from "../Media/AdaptiveImage";
import { toRichContentExcerpt } from "../../utils/richContent";
import {
  getOptimizedVideoUrl,
  getVideoPosterUrl,
  looksVideo,
} from "../../utils/media";
import { useLocale } from "../../i18n/LocaleContext";
import { localizePath } from "../../i18n/routing.js";

const BlogItem = ({ item, index }) => {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef(null);

  const cover =
    item?.cover?.url ||
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nNjQwJyBoZWlnaHQ9JzM2MCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48cmVjdCBmaWxsPSIjZWVlIiB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJy8+PC9zdmc+";
  const coverMedia = item?.cover || cover;
  const coverIsVideo =
    item?.cover?.resourceType === "video" || looksVideo(cover);
  const posterUrl = useMemo(
    () =>
      coverIsVideo
        ? getVideoPosterUrl(coverMedia, { width: 960, quality: "auto:good" })
        : "",
    [coverIsVideo, coverMedia]
  );
  const videoUrl = useMemo(
    () =>
      coverIsVideo
        ? getOptimizedVideoUrl(coverMedia, {
            width: 960,
            purpose: "preview",
          })
        : "",
    [coverIsVideo, coverMedia]
  );
  const isTouch =
    typeof window !== "undefined" &&
    window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const createdText = item?.createdAt
    ? new Date(item.createdAt).toLocaleDateString(locale === "en" ? "en-GB" : "tr-TR")
    : "";
  const commentsCount = Number(item?.commentsCount || 0);
  const excerpt = toRichContentExcerpt(item?.content, 160);

  return (
    <motion.article
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
      className="group rounded-2xl overflow-hidden border border-white/30 bg-white/60 
                 backdrop-blur-xl shadow-lg hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)] transform-gpu-soft
                 transition-all cursor-pointer"
      onMouseEnter={() => {
        setHovered(true);
        if (!coverIsVideo || isTouch || !videoRef.current) return;
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }}
      onMouseLeave={() => {
        setHovered(false);
        if (!coverIsVideo || !videoRef.current) return;
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }}
      onClick={() => navigate(localizePath(`/blog/${item._id}`, locale))}
      role="button"
      tabIndex={0}
      onKeyDown={(e) =>
        e.key === "Enter" && navigate(localizePath(`/blog/${item._id}`, locale))
      }
      aria-label={`${item?.title || "Blog"} ${locale === "en" ? "view details" : "detayına git"}`}
    >
      {/* Kapak */}
      <div className="relative w-full h-56 md:h-60 overflow-hidden">
        {coverIsVideo ? (
          <>
            <img
              src={posterUrl || cover}
              alt={item?.title || "blog video kapak"}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <video
              ref={videoRef}
              src={videoUrl || cover}
              muted
              loop
              playsInline
              preload="none"
              poster={posterUrl || undefined}
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 ${
                hovered && !isTouch ? "opacity-100 scale-105" : "opacity-0"
              }`}
            />
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-black/45 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                <PlayCircle size={15} />
                {locale === "en" ? "Watch video" : "Videoyu izle"}
              </div>
            </div>
          </>
        ) : (
          <AdaptiveImage
            media={item?.cover || cover}
            alt={item?.title || "blog kapak"}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            widths={[320, 480, 640, 800, 960]}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent opacity-90" />
        {createdText && (
          <span className="absolute top-3 right-3 text-[11px] tracking-wide uppercase bg-white/90 text-gray-700 px-2 py-1 rounded-full shadow-md">
            {createdText}
          </span>
        )}
      </div>

      {/* İçerik */}
      <div className="p-6">
        <h3 className="text-lg md:text-xl font-semibold text-secondaryColor line-clamp-2">
          {item?.title || (locale === "en" ? "Title" : "Başlık")}
        </h3>

        {/* Etiketler */}
        {Array.isArray(item?.tags) && item.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {item.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="text-[11px] px-2 py-1 rounded-full bg-quaternaryColor/10 text-quaternaryColor border border-quaternaryColor/30"
              >
                {t}
              </span>
            ))}
            {item.tags.length > 4 && (
              <span className="text-[11px] text-gray-500">
                +{item.tags.length - 4}
              </span>
            )}
          </div>
        )}

        <p className="mt-3 text-sm text-gray-700 line-clamp-3">{excerpt}</p>

        <div className="mt-5 flex items-center justify-between">
          <div className="h-[2px] w-0 group-hover:w-1/2 bg-quaternaryColor/90 transition-all duration-500" />
          <span className="text-xs text-gray-500">
            {commentsCount > 0
              ? `${commentsCount} ${locale === "en" ? "comments" : "yorum"}`
              : locale === "en"
              ? "No comments"
              : "Yorum yok"}
          </span>
        </div>
      </div>
    </motion.article>
  );
};

BlogItem.propTypes = {
  item: PropTypes.shape({
    _id: PropTypes.string,
    title: PropTypes.string,
    content: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    cover: PropTypes.shape({
      url: PropTypes.string,
      storageKey: PropTypes.string,
      posterUrl: PropTypes.string,
      resourceType: PropTypes.oneOf(["image", "video"]),
    }),
    createdAt: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number,
      PropTypes.instanceOf(Date),
    ]),
    commentsCount: PropTypes.number,
  }).isRequired,
  index: PropTypes.number.isRequired,
};

export default BlogItem;
