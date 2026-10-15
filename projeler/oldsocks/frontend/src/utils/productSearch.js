// Türkçe ürün araması: büyük/küçük harf ve Türkçe karakterden bağımsız, kelime bazlı.
// "SİYAH", "siyah" ve "sıyah" aynı sonucu verir; "gomlek" "Gömlek"i bulur.
const FOLD = { ı: "i", ö: "o", ü: "u", ş: "s", ç: "c", ğ: "g", â: "a", î: "i", û: "u" };

export function normalizeSearchText(value) {
  return String(value ?? "")
    .toLocaleLowerCase("tr")
    .replace(/[ıöüşçğâîû]/g, (ch) => FOLD[ch])
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function searchTokens(query) {
  return normalizeSearchText(query).split(" ").filter(Boolean);
}

function categoryNames(product) {
  const category = product?.category;
  if (!category || typeof category !== "object") return [];
  const parent = category.parent && typeof category.parent === "object" ? category.parent.name : "";
  return [category.name, parent];
}

// Tüm kelimeler ürün adı, renk veya kategori adlarında geçmeli. Adında geçenler önce gelir.
export function searchProducts(products, query, { limit = Infinity } = {}) {
  const tokens = searchTokens(query);
  if (!tokens.length) return [];
  const scored = [];
  for (const product of Array.isArray(products) ? products : []) {
    const name = normalizeSearchText(product?.name);
    const haystack = `${name} ${normalizeSearchText([product?.color, ...categoryNames(product)].join(" "))}`;
    if (!tokens.every((token) => haystack.includes(token))) continue;
    const inName = tokens.filter((token) => name.includes(token)).length;
    scored.push({ product, score: inName * 2 + (name.startsWith(tokens[0]) ? 1 : 0) });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((entry) => entry.product);
}
