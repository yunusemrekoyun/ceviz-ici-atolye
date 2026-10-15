import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { getOptimizedImageUrl, getVideoPosterUrl, looksVideo } from "../../utils/media";
import { useLocale } from "../../i18n/LocaleContext";
import { localizePath } from "../../i18n/routing.js";

const OtherServiceItem = ({ service }) => {
  const { locale } = useLocale();
  const coverUrl = service?.cover?.url || "";
  const isVideo =
    service?.cover?.resourceType === "video" || looksVideo(coverUrl);

  const imageMedia =
    (!isVideo && service?.cover) ||
    service?.imageDataUrl ||
    service?.imageUrl ||
    service?.images?.find((m) => m?.url && m?.resourceType !== "video") ||
    service?.images?.find((m) => m?.url) ||
    service?.cover ||
    "";
  const img = isVideo
    ? getVideoPosterUrl(service?.cover || { url: coverUrl, resourceType: "video" }, {
        width: 240,
      }) || coverUrl
    : getOptimizedImageUrl(imageMedia, {
        width: 240,
        fallbackSrc:
          service?.cover?.url ||
          service?.imageDataUrl ||
          service?.imageUrl ||
          "",
      });

  return (
    <Link
      to={localizePath(`/services/${service._id}`, locale)}
      state={{ title: service?.title || "", service }}
      className="group flex gap-3 rounded-lg overflow-hidden border bg-white hover:shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-quaternaryColor/60"
      aria-label={`${service?.title || (locale === "en" ? "Service" : "Hizmet")} ${
        locale === "en" ? "view details" : "detayına git"
      }`}
    >
      <div className="w-16 h-20 overflow-hidden shrink-0">
        <img
          src={img}
          alt={service.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>
      <div className="flex-1 py-2 pr-2">
        <h4 className="text-sm font-semibold text-gray-800 line-clamp-2">
          {service.title}
        </h4>
        {service.category && (
          <p className="text-xs text-gray-500 mt-1">{service.category}</p>
        )}
      </div>
    </Link>
  );
};

OtherServiceItem.propTypes = {
  service: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string,
    category: PropTypes.string,
    cover: PropTypes.shape({
      url: PropTypes.string,
      resourceType: PropTypes.string, // "image" | "video"
    }),
    imageDataUrl: PropTypes.string,
    imageUrl: PropTypes.string,
    images: PropTypes.arrayOf(
      PropTypes.shape({
        url: PropTypes.string,
        resourceType: PropTypes.string,
      })
    ),
  }).isRequired,
};

export default OtherServiceItem;
