const FALLBACK_SVG =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nNjQwJyBoZWlnaHQ9JzM2MCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48cmVjdCBmaWxsPSIjZWVlIiB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJy8+PC9zdmc+";

const normalizeBaseUrl = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\/+$/g, "");

const deriveMediaOrigin = () => {
  const apiBase = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || "");
  if (apiBase) {
    return apiBase.replace(/\/api$/i, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
};

const MEDIA_ORIGIN = deriveMediaOrigin();

const absolutizeMediaUrl = (value = "") => {
  const url = String(value || "").trim();
  if (!url) return "";

  if (/^(?:data:|blob:|https?:\/\/|\/\/)/i.test(url)) {
    return url;
  }

  if (!MEDIA_ORIGIN) return url;

  try {
    return new URL(url, `${MEDIA_ORIGIN}/`).toString();
  } catch {
    return url;
  }
};

const normalizeVariants = (variants = []) =>
  (Array.isArray(variants) ? variants : [])
    .map((variant) => {
      const url = absolutizeMediaUrl(variant?.url || "");
      const storageKey = String(variant?.storageKey || "").trim();
      const width = Number(variant?.width) || 0;
      const height = Number(variant?.height) || 0;
      const bytes = Number(variant?.bytes) || 0;

      if (!url || !width) return null;

      return {
        ...variant,
        url,
        storageKey,
        width,
        height: height || undefined,
        bytes: bytes || undefined,
        label: String(variant?.label || `w${width}`),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.width - b.width);

const pickVariantByWidth = (variants = [], width, originalWidth) => {
  const list = Array.isArray(variants) ? variants : [];
  if (!list.length) return null;
  const targetWidth = Number(width) || 0;
  if (!targetWidth) {
    return originalWidth ? null : list[list.length - 1];
  }

  const matchedVariant = list.find((variant) => variant.width >= targetWidth);
  if (matchedVariant) return matchedVariant;

  if (
    Number(originalWidth) >= targetWidth ||
    Number(originalWidth) > list[list.length - 1].width
  ) {
    return null;
  }

  return list[list.length - 1];
};

const pickBestImageVariant = (media, width) => {
  const variants = media?.variants || [];
  return pickVariantByWidth(variants, width, media?.width);
};

const pickVideoVariant = (media, { width, purpose } = {}) => {
  const variants = media?.variants || [];
  if (!variants.length) return null;

  const normalizedPurpose = String(purpose || "").trim().toLowerCase();
  if (normalizedPurpose) {
    const exact = variants.find(
      (variant) =>
        String(variant.label || "").trim().toLowerCase() === normalizedPurpose
    );
    if (exact) return exact;
  }

  if (normalizedPurpose === "preview") {
    return variants[0] || null;
  }

  if (normalizedPurpose === "detail") {
    return null;
  }

  return (
    pickVariantByWidth(variants, width, media?.width) ||
    variants[variants.length - 1]
  );
};

export const looksVideo = (url = "") =>
  /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(String(url));

export const resolveMedia = (resource, fallbackType = "image") => {
  if (!resource) return null;

  if (typeof resource === "string") {
    const url = absolutizeMediaUrl(resource);
    if (!url) return null;
    return {
      url,
      resourceType: looksVideo(url) ? "video" : fallbackType,
      posterUrl: "",
      storageKey: "",
      variants: [],
    };
  }

  const url = absolutizeMediaUrl(resource.url || resource.src || "");
  if (!url) return null;

  return {
    ...resource,
    url,
    posterUrl: absolutizeMediaUrl(
      resource.posterUrl || resource.poster_url || ""
    ),
    storageKey: String(resource.storageKey || "").trim(),
    variants: normalizeVariants(resource.variants),
    resourceType:
      resource.resourceType ||
      resource.resource_type ||
      (looksVideo(url) ? "video" : fallbackType),
  };
};

export const getMediaKey = (resource) => {
  const media = resolveMedia(resource);
  return media?.storageKey || media?.url || "";
};

export const getMediaUrl = (resource, fallback = "") =>
  resolveMedia(resource)?.url || fallback;

export const getOptimizedImageUrl = (
  resource,
  { width, fallbackSrc = FALLBACK_SVG } = {}
) => {
  const media = resolveMedia(resource, "image");
  if (!media) {
    if (typeof resource === "string") return resource || fallbackSrc;
    return resource?.url || fallbackSrc;
  }

  if (media.resourceType === "video") {
    return media.posterUrl || fallbackSrc;
  }

  return pickBestImageVariant(media, width)?.url || media.url || fallbackSrc;
};

export const getImageSrcSet = (resource) => {
  const media = resolveMedia(resource, "image");
  if (!media || media.resourceType !== "image") return undefined;

  const entries = [...(media.variants || [])];
  if (media.url && media.width) {
    entries.push({
      url: media.url,
      width: media.width,
    });
  }

  const unique = Array.from(
    new Map(
      entries
        .filter((entry) => entry?.url && entry?.width)
        .map((entry) => [entry.width, entry])
    ).values()
  ).sort((a, b) => a.width - b.width);

  if (!unique.length) return undefined;

  return unique.map((entry) => `${entry.url} ${entry.width}w`).join(", ");
};

export const getOptimizedVideoUrl = (
  resource,
  { width, purpose } = {}
) => {
  const media = resolveMedia(resource, "video");
  if (!media) {
    if (typeof resource === "string") return resource || "";
    return resource?.url || "";
  }

  if (media.resourceType !== "video") return "";

  return pickVideoVariant(media, { width, purpose })?.url || media.url || "";
};

export const getVideoPosterUrl = (
  resource,
  { fallbackSrc = FALLBACK_SVG } = {}
) => {
  const media = resolveMedia(resource, "video");
  if (!media) return fallbackSrc;

  if (media.resourceType !== "video") {
    return media.url || fallbackSrc;
  }

  return media.posterUrl || fallbackSrc;
};

export const getResponsiveImageProps = (
  resource,
  {
    width,
    widths,
    height,
    sizes = "100vw",
    crop,
    gravity,
    quality,
    fallbackSrc = FALLBACK_SVG,
  } = {}
) => ({
  src: getOptimizedImageUrl(resource, {
    width,
    widths,
    height,
    crop,
    gravity,
    quality,
    fallbackSrc,
  }),
  srcSet: getImageSrcSet(resource, { widths, crop, gravity, quality }),
  sizes,
});

export { FALLBACK_SVG };
