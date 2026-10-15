// src/components/Links/LinkItem.jsx
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useLocale } from "../../i18n/LocaleContext";

const LinkItem = ({
  label,
  img,
  color,
  desc,
  href,
  isHovered,
  forceExpanded,
  onMouseEnter,
  onMouseLeave,
}) => {
  const { locale } = useLocale();
  return (
    <div
      className={`
        group relative w-full sm:w-60 h-[300px] sm:h-[260px] transform-gpu-soft
        rounded-2xl shadow-lg bg-white/10 backdrop-blur
        transition-transform duration-300 ease-out
        ${isHovered && !forceExpanded ? "scale-[1.04] z-10" : "scale-100 z-0"}
      `}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ transformOrigin: "center" }}
    >
      <img
        src={img}
        alt={label}
        className="absolute inset-0 w-full h-full object-cover object-center rounded-2xl"
        loading="lazy"
        decoding="async"
      />

      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-black/10 via-black/0 to-black/30 pointer-events-none" />

      <div
        className={`
          absolute left-2 right-2 bottom-2
          rounded-xl border border-white/40 bg-white/80 backdrop-blur-xl shadow-md
          overflow-hidden transition-all duration-300
          ${forceExpanded ? "h-[9.5rem]" : isHovered ? "h-36" : "h-14"}
        `}
      >
        <div className="h-14 px-4 flex items-center">
          <span
            className={`font-semibold ${color} text-base line-clamp-1`}
            title={label}
          >
            {label}
          </span>
        </div>

        <div
          className={`
            px-4 pb-3 space-y-3 transition-opacity duration-300
            ${forceExpanded || isHovered ? "opacity-100" : "opacity-0 pointer-events-none"}
          `}
        >
          {desc ? (
            <p className="text-xs text-gray-600 line-clamp-2">{desc}</p>
          ) : null}

          <Link
            to={href}
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold
                       bg-quaternaryColor text-white hover:bg-secondaryColor transition-colors"
          >
            {locale === "en" ? "Details" : "Detay"}
          </Link>
        </div>
      </div>
    </div>
  );
};

LinkItem.propTypes = {
  label: PropTypes.string.isRequired,
  img: PropTypes.string.isRequired,
  color: PropTypes.string,
  desc: PropTypes.string,
  href: PropTypes.string,
  isHovered: PropTypes.bool.isRequired,
  forceExpanded: PropTypes.bool,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
};

export default LinkItem;
