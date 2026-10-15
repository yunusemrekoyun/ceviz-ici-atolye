// src/components/Blog/OtherBlogItem.jsx
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { PlayCircle } from "lucide-react";
import { getVideoPosterUrl, looksVideo } from "../../utils/media";
import { useLocale } from "../../i18n/LocaleContext";
import { localizePath } from "../../i18n/routing.js";

const thumbFrom = (blog) => {
  const cover = blog?.cover?.url || "";
  if (cover)
    return {
      media: blog?.cover || { url: cover },
      url: cover,
      isVideo:
        blog?.cover?.resourceType === "video" || looksVideo(cover),
    };

  const first = (Array.isArray(blog?.assets) ? blog.assets : [])
    .concat(Array.isArray(blog?.images) ? blog.images : [])
    .concat(Array.isArray(blog?.media) ? blog.media : [])
    .find((m) => m?.url);

  const url = first?.url || "";
  return {
    media: first || { url },
    url,
    isVideo:
      first?.resourceType === "video" || looksVideo(url),
  };
};

const OtherBlogItem = ({ blog }) => {
  const { locale } = useLocale();
  const { media, url, isVideo } = thumbFrom(blog);
  const date = blog?.createdAt
    ? new Date(blog.createdAt).toLocaleDateString(locale === "en" ? "en-GB" : "tr-TR")
    : "";
  const thumbUrl = isVideo
    ? getVideoPosterUrl(media, { width: 320, quality: "auto:good" })
    : url;

  return (
    <Link
      to={localizePath(`/blog/${blog._id}`, locale)}
      className="group flex gap-3 rounded-xl overflow-hidden border bg-white hover:shadow-md transition
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-quaternaryColor/60"
      aria-label={`${blog?.title || "Blog"} ${locale === "en" ? "view details" : "detayına git"}`}
    >
      <div className="relative w-20 h-16 overflow-hidden shrink-0 bg-gray-100">
        {url ? (
          <img
            src={thumbUrl}
            alt={blog?.title || (locale === "en" ? "cover" : "kapak")}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gray-200" />
        )}
        {isVideo ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/10">
            <div className="rounded-full border border-white/30 bg-black/45 p-1.5 text-white backdrop-blur-sm">
              <PlayCircle size={14} />
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex-1 py-1.5 pr-2">
        <h4 className="text-sm font-semibold text-gray-800 line-clamp-2">
          {blog?.title || (locale === "en" ? "Title" : "Başlık")}
        </h4>
        <p className="text-[11px] text-gray-500 mt-0.5">{date}</p>
      </div>
    </Link>
  );
};

OtherBlogItem.propTypes = {
  blog: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string,
    createdAt: PropTypes.string,
    cover: PropTypes.shape({
      url: PropTypes.string,
      resourceType: PropTypes.oneOf(["image", "video"]),
    }),
    assets: PropTypes.array,
    images: PropTypes.array,
    media: PropTypes.array,
  }).isRequired,
};

export default OtherBlogItem;
