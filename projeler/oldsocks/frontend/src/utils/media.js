function nearestSource(sources, targetWidth) {
  const sorted = sources
    .filter((source) => source?.url)
    .sort((a, b) => Number(a.width || 0) - Number(b.width || 0));
  if (!sorted.length) return null;
  return (
    sorted.find((source) => Number(source.width || 0) >= targetWidth) ||
    sorted.at(-1)
  );
}

export function getResponsiveImageProps(mediaOrUrl, options = {}) {
  const sizes = options.sizes || "100vw";
  if (!mediaOrUrl || typeof mediaOrUrl === "string") {
    return { src: mediaOrUrl || "", srcSet: undefined, sizes };
  }

  const requestedWidths = (options.widths || [])
    .map(Number)
    .filter((width) => width > 0);
  const sources = (mediaOrUrl.sources || []).filter(
    (source) => source?.url && source.format !== "jpeg"
  );
  const defaultWidth =
    Number(options.defaultWidth) || requestedWidths.at(-1) || Infinity;
  const selected = nearestSource(sources, defaultWidth);
  const usable = sources
    .filter((source) => Number(source.width || 0) > 0)
    .filter(
      (source) =>
        !requestedWidths.length ||
        requestedWidths.some(
          (width) => Math.abs(Number(source.width) - width) <= Math.max(80, width * 0.25)
        )
    );
  const srcSet = [...new Map(usable.map((source) => [source.width, source])).values()]
    .sort((a, b) => Number(a.width) - Number(b.width))
    .map((source) => `${source.url} ${source.width}w`)
    .join(", ");

  return {
    src: selected?.url || mediaOrUrl.url || "",
    srcSet: srcSet || undefined,
    sizes,
  };
}

export function getMediaVideoUrl(media, variant = "detail") {
  if (!media || typeof media === "string") return media || "";
  return (
    media.videos?.find((source) => source.name === variant)?.url ||
    media.videos?.at(-1)?.url ||
    media.url ||
    ""
  );
}
