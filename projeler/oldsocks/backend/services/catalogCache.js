// Vitrin kataloğunun sunucu içi önbellekleri. Ürün, stok, indirim veya kategori
// değiştiğinde invalidateCatalog() hepsini birlikte temizler; aksi hâlde satılan
// son ürün bir süre stokta görünebilir.
const { timedCache } = require("./timedCache");

const productsCache = timedCache(60 * 1000);

const DETAIL_TTL_MS = 30 * 1000;
const DETAIL_MAX_ENTRIES = 1000;
const details = new Map();

// Anahtar başına tek uçuşlu (single-flight) önbellek: aynı anda gelen istekler
// aynı veritabanı sorgusunu bekler.
function cachedDetail(key, load) {
  const now = Date.now();
  const existing = details.get(key);
  if (existing && (existing.pending || existing.expiresAt > now)) {
    return existing.pending || Promise.resolve(existing.value);
  }
  if (details.size >= DETAIL_MAX_ENTRIES) {
    // En eski girişi at (Map ekleme sırasını korur).
    details.delete(details.keys().next().value);
  }
  const entry = { value: undefined, expiresAt: 0, pending: null };
  entry.pending = Promise.resolve()
    .then(load)
    .then((value) => {
      if (details.get(key) === entry) {
        entry.value = value;
        entry.expiresAt = Date.now() + DETAIL_TTL_MS;
      }
      return value;
    })
    .catch((error) => {
      if (details.get(key) === entry) details.delete(key);
      throw error;
    })
    .finally(() => {
      entry.pending = null;
    });
  details.set(key, entry);
  return entry.pending;
}

function invalidateCatalog() {
  productsCache.invalidate();
  details.clear();
}

module.exports = { productsCache, cachedDetail, invalidateCatalog };
