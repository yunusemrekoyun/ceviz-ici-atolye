"use client";

import { useState } from "react";
import type { MediaFormats } from "@/lib/media";

type ImageSize = "sm" | "md" | "lg";

interface Props {
  formats: MediaFormats;
  alt: string;
  size?: ImageSize;
  className?: string;
  priority?: boolean;
}

const WIDTHS: Record<ImageSize, number> = { sm: 320, md: 640, lg: 1280 };

function buildSrcSet(urls: Record<ImageSize, string>): string {
  return (Object.entries(urls) as [ImageSize, string][])
    .map(([size, url]) => `${url} ${WIDTHS[size]}w`)
    .join(", ");
}

export function OptimizedImage({ formats, alt, size = "lg", className, priority }: Props) {
  const [errored, setErrored] = useState(false);

  const fallbackSrc = formats.jpeg[size];

  if (errored) {
    return <img src={fallbackSrc} alt={alt} className={className} />;
  }

  return (
    <picture>
      <source type="image/avif" srcSet={buildSrcSet(formats.avif)} sizes="100vw" />
      <source type="image/webp" srcSet={buildSrcSet(formats.webp)} sizes="100vw" />
      <img
        src={fallbackSrc}
        srcSet={buildSrcSet(formats.jpeg)}
        alt={alt}
        className={className}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onError={() => setErrored(true)}
      />
    </picture>
  );
}
