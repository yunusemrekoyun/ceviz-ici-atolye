// Varyant URL'lerinden srcset türetme — saf string işlemi, client-safe.
// Worker'ın ürettiği adlar deterministik: /m/{listingId}/{mediaId}-{width}.webp
// variants[0] her zaman üretilen EN BÜYÜK genişliktir; ondan küçük standart
// genişliklerin diskte var olduğu garantidir.
const VARIANT_RE = /^(\/m\/[\w.-]+\/[\w.-]+-)(\d+)\.webp$/;
const WIDTHS = [480, 960, 1600];

/** Yüklenmiş varyant URL'i için srcset üretir; harici URL'lerde undefined. */
export function imgSrcSet(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const m = url.match(VARIANT_RE);
  if (!m) return undefined;
  const max = Number(m[2]);
  const widths = WIDTHS.filter((w) => w <= max);
  if (widths.length <= 1) return undefined;
  return widths.map((w) => `${m[1]}${w}.webp ${w}w`).join(', ');
}

/** Küçük önizleme (kart/thumbnail) için 480'lik varyant; yoksa URL'in kendisi. */
export function thumbUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(VARIANT_RE);
  if (!m || Number(m[2]) <= 480) return url;
  return `${m[1]}480.webp`;
}
