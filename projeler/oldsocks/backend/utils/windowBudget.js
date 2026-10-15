// Bellek içi kayan pencere bütçesi: bir anahtar (ör. alıcı e-posta) için pencere
// süresi içinde en fazla `max` işleme izin verir.
function createWindowBudget({ max, windowMs, maxKeys = 20000 }) {
  const hits = new Map();
  return {
    allow(key, now = Date.now()) {
      const recent = (hits.get(key) || []).filter((at) => now - at < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.delete(key);
      hits.set(key, recent);
      if (hits.size > maxKeys) hits.delete(hits.keys().next().value);
      return true;
    },
  };
}

module.exports = { createWindowBudget };
