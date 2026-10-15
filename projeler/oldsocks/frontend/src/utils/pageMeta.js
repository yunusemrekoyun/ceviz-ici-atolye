// Sayfa başlığı, açıklama, robots ve paylaşım (Open Graph) etiketleri. Sayfalar
// tarayıcıda oluştuğu için etiketler burada güncellenir; Google JS çalıştırarak okur.
export const SITE_NAME = "OLDSOCKS";
export const DEFAULT_DESCRIPTION =
  "Kaliteyi ve tarzı bir araya getiren OLDSOCKS, her adımda konforu sunmayı hedefler. Siz de stilinize yön vermek istiyorsanız doğru yerdesiniz.";

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (content == null || content === "") {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!href) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function clip(text, max = 160) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

// title: sayfa adı (site adı eklenir); noindex: arama sonuçlarına girmesin.
export function applyPageMeta({ title, description, noindex = false, image, canonicalPath, type = "website" } = {}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const desc = clip(description || DEFAULT_DESCRIPTION);
  document.title = fullTitle;
  setMeta("name", "description", desc);
  setMeta("name", "robots", noindex ? "noindex, nofollow" : null);
  setMeta("property", "og:title", fullTitle);
  setMeta("property", "og:description", desc);
  setMeta("property", "og:type", type);
  setMeta("property", "og:image", image || `${window.location.origin}/android-chrome-512x512.png`);
  const path = canonicalPath ?? window.location.pathname;
  const url = noindex ? null : `${window.location.origin}${path}`;
  setMeta("property", "og:url", url);
  setCanonical(url);
}
