import PropTypes from "prop-types";
import { useLocation, useNavigate } from "react-router-dom";
import { useLocale } from "../../i18n/LocaleContext.jsx";
import { localizePath } from "../../i18n/routing.js";

const baseClassName =
  "inline-flex items-center rounded-full border border-white/20 bg-white/12 p-1 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-sm backdrop-blur-md";

const buttonClassName =
  "rounded-full px-3 py-1.5 transition focus:outline-none focus:ring-2 focus:ring-white/40";

export default function LanguageSwitcher({
  className = "",
  theme = "dark",
}) {
  const { locale, setLocale } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const ariaLabel =
    locale === "en" ? "Language switcher" : "Dil seçici";

  const activeClassName =
    theme === "light"
      ? "bg-slate-900 text-white shadow"
      : "bg-white text-slate-900 shadow";
  const idleClassName =
    theme === "light"
      ? "text-slate-500 hover:text-slate-900"
      : "text-white/70 hover:text-white";

  const handleSwitch = (nextLocale) => {
    if (nextLocale === locale) return;
    setLocale(nextLocale);
    navigate(
      `${localizePath(location.pathname, nextLocale)}${location.search}${location.hash}`
    );
  };

  return (
    <div
      className={`${baseClassName} ${theme === "light" ? "border-slate-200 bg-white/90" : ""} ${className}`}
      aria-label={ariaLabel}
    >
      {[
        {
          code: "tr",
          label: "TR",
          flag: "https://flagcdn.com/w20/tr.png",
          flag2x: "https://flagcdn.com/w40/tr.png",
          flagAlt: "Türk bayrağı",
        },
        {
          code: "en",
          label: "EN",
          flag: "https://flagcdn.com/w20/gb.png",
          flag2x: "https://flagcdn.com/w40/gb.png",
          flagAlt: "British flag",
        },
      ].map((item) => (
        <button
          key={item.code}
          type="button"
          onClick={() => handleSwitch(item.code)}
          className={`${buttonClassName} flex items-center gap-1.5 ${
            locale === item.code ? activeClassName : idleClassName
          }`}
          aria-pressed={locale === item.code}
        >
          <img
            src={item.flag}
            srcSet={`${item.flag} 1x, ${item.flag2x} 2x`}
            alt={item.flagAlt}
            width={16}
            height={12}
            className="rounded-[2px] object-cover"
            loading="eager"
          />
          {item.label}
        </button>
      ))}
    </div>
  );
}

LanguageSwitcher.propTypes = {
  className: PropTypes.string,
  theme: PropTypes.oneOf(["dark", "light"]),
};
