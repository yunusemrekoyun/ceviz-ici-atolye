// Herkese açık JSON yanıtlarında gömülü MediaAsset belgelerinden iç alanları çıkarır:
// yükleyen yönetici, orijinal dosya adı, depolama anahtarları, işlem ve yedek durumu.
// Yapı korunur (aynı anahtarlar, aynı varyantlar); yalnız izin listesindeki alanlar kalır.
// /media, /backups ve /admin altındaki yönetim uçlarına uygulanmaz.

const ASSET_KEYS = new Set(["_id", "id", "kind", "purpose", "status", "metadata", "variants", "primaryVariant"]);
const VARIANT_KEYS = new Set(["name", "kind", "format", "url", "mime", "width", "height", "durationSeconds", "bitrate"]);
const EXCLUDED_PREFIX = /^\/(media|backups|admin)(\/|$)/;

function isMediaAsset(value) {
  return (
    Array.isArray(value.variants) &&
    typeof value.purpose === "string" &&
    (value.kind === "image" || value.kind === "video")
  );
}

function pick(source, keys) {
  const out = {};
  for (const key of Object.keys(source)) if (keys.has(key)) out[key] = source[key];
  return out;
}

function stripPrivateAssetFields(value, depth = 0) {
  if (depth > 20 || value === null || typeof value !== "object" || value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((item) => stripPrivateAssetFields(item, depth + 1));
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    // Mongoose belgesi, ObjectId vb.: res.json'un yapacağı gibi JSON biçimine çevir.
    if (typeof value.toJSON !== "function") return value;
    const json = value.toJSON();
    return json === value ? value : stripPrivateAssetFields(json, depth + 1);
  }
  if (isMediaAsset(value)) {
    const asset = pick(value, ASSET_KEYS);
    asset.variants = value.variants.map((variant) =>
      variant && typeof variant === "object" ? pick(variant, VARIANT_KEYS) : variant
    );
    return asset;
  }
  const out = {};
  for (const [key, child] of Object.entries(value)) out[key] = stripPrivateAssetFields(child, depth + 1);
  return out;
}

// Önbellekten gelen aynı nesne tekrar tekrar gönderildiğinde yeniden taranmaz.
const memo = new WeakMap();
function filterCached(body) {
  if (!body || typeof body !== "object") return body;
  const hit = memo.get(body);
  if (hit) return hit;
  const clean = stripPrivateAssetFields(body);
  memo.set(body, clean);
  return clean;
}

function publicAssetFilter(req, res, next) {
  if ((req.method !== "GET" && req.method !== "HEAD") || EXCLUDED_PREFIX.test(req.path)) return next();
  const json = res.json.bind(res);
  res.json = (body) => json(filterCached(body));
  return next();
}

module.exports = { publicAssetFilter, stripPrivateAssetFields };
