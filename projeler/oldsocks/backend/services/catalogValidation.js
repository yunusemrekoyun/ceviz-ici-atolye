class CatalogValidationError extends Error {
  constructor(message, details = undefined) {
    super(message);
    this.name = "CatalogValidationError";
    this.statusCode = 400;
    this.details = details;
  }
}

function roundToTwo(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function requiredText(value, label, maxLength = 160) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new CatalogValidationError(`${label} zorunludur.`);
  }
  if (normalized.length > maxLength) {
    throw new CatalogValidationError(
      `${label} en fazla ${maxLength} karakter olabilir.`
    );
  }
  return normalized;
}

function finiteNumber(value, label) {
  if (value === "" || value === null || value === undefined) {
    throw new CatalogValidationError(`${label} zorunludur.`);
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new CatalogValidationError(`${label} geçerli bir sayı olmalıdır.`);
  }
  return number;
}

function parseProductPricing(input = {}) {
  const originalPrice = roundToTwo(
    finiteNumber(input.originalPrice, "Orijinal fiyat")
  );
  const price = roundToTwo(finiteNumber(input.price, "Satış fiyatı"));

  if (originalPrice < 0 || price < 0) {
    throw new CatalogValidationError("Fiyatlar sıfırdan küçük olamaz.");
  }
  if (price > originalPrice) {
    throw new CatalogValidationError(
      "Satış fiyatı orijinal fiyattan yüksek olamaz."
    );
  }

  const discount =
    originalPrice > 0 && price < originalPrice
      ? roundToTwo(100 - (price / originalPrice) * 100)
      : 0;

  return { originalPrice, price, discount };
}

// Ürün formu açıkken stok değişmiş olabilir (satış, ödeme adımında ayrım veya iadesi).
// Form her beden satırı için kaydın kimliğini (_id) ve açıldığı andaki stoğu (loadedStock)
// gönderir. Satır kimlikle eşleşir; beden adı değiştirilen satır kendi stoğunu korur.
// - Yönetici stoğa dokunmadıysa güncel stok korunur.
// - Stok açılıştan beri değişmediyse girilen değer yazılır.
// - Arada değiştiyse yazılmaz, güncel değer girilen değere eşit olsa bile (satış ya da
//   ayrım tesadüfen aynı sayıya getirmiş olabilir): yönetici güncel değeri görüp karar
//   verir (conflicts). Aynı form yeniden gönderilirse de böyle olur; stok iki kez değişmez.
// Kimliği olmayan ya da eşleşmeyen satır (yeni beden) girilen değerle yazılır. Kimliği eşleşip
// açılıştaki stoğu gelmeyen satır, güncellemeden önce açılmış eski yönetim paneli sekmesidir:
// kayıt yapılmaz (stale), yönetici sayfayı yenilemelidir.
function planStockEdits(parsedSizes, rawSizes, currentSizes) {
  let rows = rawSizes;
  if (typeof rows === "string") {
    try {
      rows = JSON.parse(rows);
    } catch {
      rows = [];
    }
  }
  if (!Array.isArray(rows)) rows = [];
  const current = new Map(
    (currentSizes || []).filter((s) => s?._id).map((s) => [String(s._id), s])
  );
  const used = new Set();
  const conflicts = [];
  let stale = false;
  const sizes = parsedSizes.map((item, index) => {
    const id = rows[index]?._id ? String(rows[index]._id) : "";
    const match = id && !used.has(id) ? current.get(id) : undefined;
    if (!match) return { size: item.size, stock: item.stock };
    used.add(id);
    const now = Number(match.stock) || 0;
    const loaded = Number(rows[index]?.loadedStock);
    let stock = item.stock;
    if (!Number.isSafeInteger(loaded) || loaded < 0 || rows[index]?.loadedStock === "" || rows[index]?.loadedStock == null) {
      stale = true;
    } else if (item.stock === loaded) {
      stock = now;
    } else if (now !== loaded) {
      conflicts.push({ _id: id, size: item.size, current: now, entered: item.stock });
    }
    return { _id: match._id, size: item.size, stock };
  });
  return { sizes, conflicts, stale };
}

function parseArray(value, label) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Aşağıdaki kullanıcı mesajı döndürülür.
    }
  }
  throw new CatalogValidationError(`${label} okunamadı.`);
}

function parseProductSizes(raw) {
  const values = parseArray(raw, "Beden ve stok bilgileri");
  if (!values.length) {
    throw new CatalogValidationError(
      "En az bir beden/stok satırı ekleyin. Bedensiz ürün için tek stok seçeneğini kullanın."
    );
  }
  if (values.length > 30) {
    throw new CatalogValidationError("Bir üründe en fazla 30 beden satırı olabilir.");
  }

  const normalized = values.map((item, index) => {
    const size = String(item?.size || "").trim();
    const stock = Number(item?.stock);
    if (size.length > 40) {
      throw new CatalogValidationError(
        `${index + 1}. satırdaki beden adı en fazla 40 karakter olabilir.`
      );
    }
    if (!Number.isSafeInteger(stock) || stock < 0) {
      throw new CatalogValidationError(
        `${index + 1}. satırdaki stok sıfır veya daha büyük bir tam sayı olmalıdır.`
      );
    }
    return { size, stock };
  });

  if (normalized.some((item) => !item.size) && normalized.length !== 1) {
    throw new CatalogValidationError(
      "Bedensiz ürün yalnızca tek stok satırı içerebilir."
    );
  }

  const seen = new Set();
  for (const item of normalized) {
    const key = item.size.toLocaleLowerCase("tr-TR");
    if (seen.has(key)) {
      throw new CatalogValidationError(
        `Aynı beden birden fazla kez eklenemez${item.size ? `: ${item.size}` : ""}.`
      );
    }
    seen.add(key);
  }

  return normalized;
}

module.exports = {
  planStockEdits,
  CatalogValidationError,
  parseProductPricing,
  parseProductSizes,
  requiredText,
};
