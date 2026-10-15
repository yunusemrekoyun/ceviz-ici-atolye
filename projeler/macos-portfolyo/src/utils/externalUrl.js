const SCHEME_REGEX = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
const LOCALHOST_REGEX =
  /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0)(?::\d+)?(\/|$)/i;

export const normalizeExternalUrl = (hrefRaw) => {
  const href = String(hrefRaw ?? "").trim();
  if (!href) return null;

  if (href.startsWith("#")) return href;

  if (SCHEME_REGEX.test(href)) return href;

  if (href.startsWith("//")) return `https:${href}`;

  if (href.startsWith("/")) return href;

  const protocol = LOCALHOST_REGEX.test(href) ? "http://" : "https://";
  return `${protocol}${href}`;
};

