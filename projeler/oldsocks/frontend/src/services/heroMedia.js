import publicApi from "../../publicApi";
import { getResponsiveImageProps } from "../utils/media";

// Hero ve ön yükleme aynı srcset/sizes'ı kullanmalı; yoksa tarayıcı görseli iki kez indirir.
export const HERO_IMAGE_OPTIONS = {
  widths: [640, 960, 1280, 1600, 1920, 2400],
  defaultWidth: 1600,
  sizes: "100vw",
};

const TTL_MS = 60 * 1000;
let pending = null;
let fetchedAt = 0;
let resolved = null;

export function loadHeroItems() {
  if (!pending || Date.now() - fetchedAt > TTL_MS) {
    fetchedAt = Date.now();
    pending = publicApi
      .get("/hero-videos")
      .then((res) => {
        resolved = Array.isArray(res.data) ? res.data : [];
        return resolved;
      })
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}

// Önceden alınmış veri varsa hero ilk çizimde yer tutucu yerine gerçek içerikle açılır.
export function peekHeroItems() {
  return resolved && Date.now() - fetchedAt <= TTL_MS ? resolved : null;
}

// Ana sayfa açılırken hero verisini ve ilk görseli React ile sayfa parçasını
// beklemeden ister (LCP). Görsel değilse (video) yalnız veri önceden alınır.
export function prefetchHero() {
  loadHeroItems()
    .then((items) => {
      const first = items[0];
      if (!first || first.kind !== "image" || document.querySelector("link[data-hero-preload]")) return;
      const image = getResponsiveImageProps(first.media || first.url, HERO_IMAGE_OPTIONS);
      if (!image.src) return;
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = image.src;
      if (image.srcSet) {
        link.setAttribute("imagesrcset", image.srcSet);
        link.setAttribute("imagesizes", image.sizes);
      }
      link.setAttribute("fetchpriority", "high");
      link.dataset.heroPreload = "1";
      document.head.appendChild(link);
    })
    .catch(() => {});
}
