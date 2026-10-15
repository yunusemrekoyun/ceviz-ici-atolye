// Header markası: logo görseli, yazı ya da ikisi (admin → Site İçeriği → Header markası).
import React from "react";
import logo from "../../assets/logo/logo.webp";
import { BRAND_FONTS } from "../../utils/brandFonts";

const fallbackLogo = (event) => {
  event.currentTarget.removeAttribute("srcset");
  if (!event.currentTarget.src.endsWith(logo)) event.currentTarget.src = logo;
};


export default function HeaderBrand({ header, logoProps, compact = false }) {
  const mode = header?.mode || "both";
  const showLogo = mode !== "text";
  const showText = mode !== "logo";
  const logoSize = mode === "logo"
    ? compact ? "h-11 w-11" : "h-12 w-12 lg:h-14 lg:w-14"
    : compact ? "h-8 w-8 sm:h-9 sm:w-9" : "h-9 w-9 sm:h-10 sm:w-10 lg:h-11 lg:w-11";
  return (
    <span className="flex min-w-0 items-center gap-2 sm:gap-2.5">
      {showLogo && (
        <img
          src={logoProps.src}
          srcSet={logoProps.srcSet}
          sizes={logoProps.sizes}
          onError={fallbackLogo}
          alt={showText ? "" : "Oldsocks Logo"}
          width="256"
          height="256"
          decoding="async"
          className={`${logoSize} shrink-0 rounded-full object-cover shadow-[0_2px_10px_-2px_rgba(0,0,0,0.35)] transition-all duration-300`}
        />
      )}
      {showText && (
        <span
          className={`brand-wordmark block max-w-[46vw] truncate leading-[1.15] transition-all duration-300 sm:max-w-none ${
            header?.style === "dark" ? "text-dark1" : "brand-chrome"
          } ${compact ? "text-[25px] sm:text-[28px]" : "text-[27px] sm:text-[30px] lg:text-[36px]"}`}
          style={(BRAND_FONTS[header?.font] || BRAND_FONTS.pirata).style}
        >
          {header?.text || "OLDSOCKS"}
        </span>
      )}
    </span>
  );
}

