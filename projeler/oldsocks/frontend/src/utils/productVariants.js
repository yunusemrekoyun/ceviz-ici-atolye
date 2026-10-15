const COLOR_MAP = {
  siyah: "#000000",
  black: "#000000",
  beyaz: "#ffffff",
  white: "#ffffff",
  kırmızı: "#ff0000",
  kirmizi: "#ff0000",
  red: "#ff0000",
  mavi: "#0000ff",
  blue: "#0000ff",
  lacivert: "#001a4d",
  navy: "#001a4d",
  yeşil: "#008000",
  yesil: "#008000",
  green: "#008000",
  sarı: "#ffd100",
  sari: "#ffd100",
  yellow: "#ffd100",
  pembe: "#ff69b4",
  pink: "#ff69b4",
  mor: "#6a0dad",
  purple: "#6a0dad",
  gri: "#808080",
  gray: "#808080",
  grey: "#808080",
  kahverengi: "#8b4513",
  brown: "#8b4513",
  turuncu: "#ff7f00",
  orange: "#ff7f00",
  bej: "#f5f5dc",
  beige: "#f5f5dc",
};

export function toCssColor(value) {
  if (!value) return "#ddd";
  const normalized = String(value).trim().toLowerCase();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized)) return normalized;
  if (/^rgba?\(/i.test(normalized)) return normalized;
  return COLOR_MAP[normalized] || normalized;
}

export function getVariantBaseId(product) {
  if (!product) return "";
  const parentId = product.parentProductId?._id || product.parentProductId;
  return String(parentId || product._id || "");
}

export function buildVariantColorMap(products) {
  const map = new Map();

  (Array.isArray(products) ? products : []).forEach((product) => {
    const productId = String(product?._id || "");
    const baseId = getVariantBaseId(product);
    const color = String(product?.color || "").trim();

    if (!productId || !baseId || !color) return;

    const current = map.get(baseId) || [];
    if (!current.some((variant) => String(variant._id) === productId)) {
      current.push({ _id: productId, color });
      map.set(baseId, current);
    }
  });

  return map;
}

export function getVariantColors(product, variantColorMap) {
  if (!variantColorMap || !(variantColorMap instanceof Map)) return [];
  return variantColorMap.get(getVariantBaseId(product)) || [];
}
