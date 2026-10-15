export const DEFAULT_LOCALE = "tr";
export const EN_LOCALE = "en";
export const SUPPORTED_LOCALES = new Set([DEFAULT_LOCALE, EN_LOCALE]);

const EXTERNAL_PROTOCOL_RE = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i;

const normalizePathname = (pathname = "/") => {
  const value = String(pathname || "/").trim();
  const [pathOnly = "/"] = value.split(/[?#]/, 1);
  if (!pathOnly) return "/";
  return pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
};

export const normalizeLocale = (locale) =>
  locale === EN_LOCALE ? EN_LOCALE : DEFAULT_LOCALE;

export const getLocaleFromPathname = (pathname = "/") => {
  const normalized = normalizePathname(pathname);
  return normalized === "/en" || normalized.startsWith("/en/")
    ? EN_LOCALE
    : DEFAULT_LOCALE;
};

export const stripLocalePrefix = (pathname = "/") => {
  const normalized = normalizePathname(pathname);
  if (normalized === "/en") return "/";
  if (normalized.startsWith("/en/")) {
    return normalized.slice(3) || "/";
  }
  return normalized;
};

export const localizePath = (pathname = "/", locale = DEFAULT_LOCALE) => {
  const value = String(pathname || "").trim();
  if (!value) return normalizeLocale(locale) === EN_LOCALE ? "/en" : "/";
  if (
    EXTERNAL_PROTOCOL_RE.test(value) ||
    value.startsWith("#") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:")
  ) {
    return value;
  }

  const normalized = normalizePathname(value);
  if (normalized.startsWith("/admin")) return normalized;

  const basePath = stripLocalePrefix(normalized);
  if (normalizeLocale(locale) === EN_LOCALE) {
    return basePath === "/" ? "/en" : `/en${basePath}`;
  }
  return basePath;
};

const withOrigin = (origin = "", pathname = "/") => {
  const safeOrigin =
    origin && /^https?:\/\//i.test(origin)
      ? origin.replace(/\/+$/, "")
      : "";
  return safeOrigin ? `${safeOrigin}${pathname}` : pathname;
};

export const buildLocaleAlternates = (pathname = "/", origin = "") => {
  const basePath = stripLocalePrefix(pathname);
  const trPath = localizePath(basePath, DEFAULT_LOCALE);
  const enPath = localizePath(basePath, EN_LOCALE);

  return {
    tr: withOrigin(origin, trPath),
    en: withOrigin(origin, enPath),
    "x-default": withOrigin(origin, trPath),
  };
};
