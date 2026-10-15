import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AdaptiveImage from "../Media/AdaptiveImage";
import { toRichContentExcerpt } from "../../utils/richContent";
import { useLocale } from "../../i18n/LocaleContext";
import { localizePath } from "../../i18n/routing.js";

const JournalGridItem = ({ item, index }) => {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const prettyDate = item?.date
    ? new Date(item.date).toLocaleDateString(locale === "en" ? "en-GB" : "tr-TR")
    : "";
  const cover =
    item?.coverUrl ||
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nNjQwJyBoZWlnaHQ9JzM2MCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48cmVjdCBmaWxsPSIjZWVlIiB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJy8+PC9zdmc+";
  const contentExcerpt = toRichContentExcerpt(item?.content, 150);

  return (
    <motion.article
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
      className="group rounded-2xl overflow-hidden border border-white/30 bg-white/50 
                 backdrop-blur-xl shadow-lg hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)] transform-gpu-soft
                 transition-all cursor-pointer"
      onClick={() => navigate(localizePath(`/journals/${item._id}`, locale))}
      role="button"
      tabIndex={0}
      onKeyDown={(e) =>
        e.key === "Enter" && navigate(localizePath(`/journals/${item._id}`, locale))
      }
      aria-label={`${item?.title || (locale === "en" ? "News" : "Haber")} ${
        locale === "en" ? "view details" : "detayına git"
      }`}
    >
      {/* Kapak */}
      <div className="relative w-full h-56 md:h-60 overflow-hidden">
        <AdaptiveImage
          media={item?.cover || cover}
          alt={item?.title || (locale === "en" ? "news image" : "haber görseli")}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          widths={[320, 480, 640, 800, 960]}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent opacity-95" />
        {prettyDate && (
          <span className="absolute top-3 right-3 text-[11px] tracking-wide uppercase bg-white/90 text-gray-700 px-2 py-1 rounded-full shadow-md">
            {prettyDate}
          </span>
        )}
      </div>

      {/* İçerik */}
      <div className="p-6">
        <h3 className="text-lg md:text-xl font-semibold text-secondaryColor line-clamp-2">
          {item?.title || (locale === "en" ? "Title" : "Başlık")}
        </h3>
        {contentExcerpt && (
          <p
            className="mt-3 text-sm text-gray-700 line-clamp-3"
            title={contentExcerpt}
          >
            {contentExcerpt}
          </p>
        )}

        <div className="mt-5 h-[2px] w-0 group-hover:w-1/2 bg-quaternaryColor/90 transition-all duration-500" />
      </div>
    </motion.article>
  );
};

JournalGridItem.propTypes = {
  item: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string,
    cover: PropTypes.shape({
      url: PropTypes.string,
      storageKey: PropTypes.string,
      posterUrl: PropTypes.string,
      resourceType: PropTypes.string,
    }),
    coverUrl: PropTypes.string,
    content: PropTypes.string,
    date: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
  }).isRequired,
  index: PropTypes.number.isRequired,
};

export default JournalGridItem;
