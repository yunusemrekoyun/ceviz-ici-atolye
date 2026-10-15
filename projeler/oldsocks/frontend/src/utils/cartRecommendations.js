import { getVariantBaseId } from "./productVariants.js";

function categoryIds(product) {
  const category = product?.category;
  return {
    id: String(category?._id || category || ""),
    parent: String(category?.parent?._id || category?.parent || ""),
  };
}

function available(product) {
  return Array.isArray(product?.sizes)
    && product.sizes.some((row) => Number(row?.stock) > 0);
}

export function selectCartRecommendations(products, items, prioritizedIds = [], limit = 4) {
  if (!Array.isArray(products) || !Array.isArray(items) || !items.length) return [];
  const cartIds = new Set(items.map((item) => String(item.id)));
  const productById = new Map(products.map((product) => [String(product._id), product]));
  const cartProducts = items.map((item) => productById.get(String(item.id))).filter(Boolean);
  const cartFamilies = new Set(cartProducts.map(getVariantBaseId));
  const cartCategories = cartProducts.map(categoryIds);
  const eligible = products.filter((product) => product?._id
    && !cartIds.has(String(product._id))
    && !cartFamilies.has(getVariantBaseId(product))
    && Number(product.price) >= 0
    && available(product));
  const eligibleById = new Map(eligible.map((product) => [String(product._id), product]));
  const chosen = [];
  const chosenFamilies = new Set();

  function include(product) {
    if (!product || chosenFamilies.has(getVariantBaseId(product))) return;
    chosen.push(product);
    chosenFamilies.add(getVariantBaseId(product));
  }

  for (const id of prioritizedIds) include(eligibleById.get(String(id)));

  const ranked = eligible.map((product, index) => {
    const category = categoryIds(product);
    const score = cartCategories.reduce((best, current) => {
      if (category.id && category.id === current.id) return Math.max(best, 2);
      if (category.parent && category.parent === current.parent) return Math.max(best, 1);
      return best;
    }, 0);
    return { product, score, index };
  }).sort((a, b) => b.score - a.score || a.index - b.index);

  for (const { product } of ranked) {
    include(product);
    if (chosen.length >= limit) break;
  }
  return chosen.slice(0, limit);
}
