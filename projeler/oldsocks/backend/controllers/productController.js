const mongoose = require("mongoose");
const Product = require("../models/Product");
const Category = require("../models/Category");
const { MediaError } = require("../services/media/errors");
const { compactProductListItem } = require("../services/catalogResponses");
const {
  CatalogValidationError,
  parseProductPricing,
  parseProductSizes,
  planStockEdits,
  requiredText,
} = require("../services/catalogValidation");
const {
  applyProductMedia,
  legacyAssetUrl,
  parseAssetIds,
  removeOwnerMediaReferences,
  requireReadyAssets,
  syncOwnerMediaReferences,
} = require("../services/media/assets");

const { productsCache, cachedDetail, invalidateCatalog } = require("../services/catalogCache");
const { prepareJson, sendPreparedJson } = require("../services/preparedJson");
const { stripPrivateAssetFields } = require("../middleware/publicAssetFilter");

function invalidateProductsCache() {
  invalidateCatalog();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function populateProductMedia(query) {
  return query
    .populate("imageAssets")
    .populate("videoAsset")
    .populate({
      path: "category",
      select: "name image imageAsset parent",
      populate: [
        { path: "parent", select: "name" },
        { path: "imageAsset" },
      ],
    });
}

async function resolveProductAssets(body, options = {}) {
  const imageAssets = await requireReadyAssets(body.imageAssetIds, {
    purpose: "product_image",
    kind: "image",
    min: options.imageMin ?? 1,
    max: 6,
  });
  const videoIds = parseAssetIds(body.videoAssetId);
  const videoAssets = await requireReadyAssets(videoIds, {
    purpose: "product_video",
    kind: "video",
    min: 0,
    max: 1,
  });
  return { imageAssets, videoAsset: videoAssets[0] || null };
}

async function syncProductReferences(product) {
  await syncOwnerMediaReferences({
    ownerType: "Product",
    ownerId: product._id,
    fields: {
      images: product.imageAssets || [],
      video: product.videoAsset ? [product.videoAsset] : [],
    },
  });
}

exports.createProduct = async (req, res) => {
  try {
    const { category, description, color } = req.body;
    const name = requiredText(req.body.name, "Ürün adı");
    const pricing = parseProductPricing(req.body);
    const sizes = parseProductSizes(req.body.sizes);
    if (!(await Category.exists({ _id: category, archivedAt: null }))) {
      return res.status(400).json({ message: "Geçersiz kategori." });
    }
    const { imageAssets, videoAsset } = await resolveProductAssets(req.body);
    const product = await Product.create({
      name,
      videoAsset: videoAsset?._id || null,
      imageAssets: imageAssets.map((asset) => asset._id),
      video: videoAsset ? legacyAssetUrl(videoAsset, "detail") : "",
      images: imageAssets.map((asset) => legacyAssetUrl(asset, "detail")),
      price: pricing.price,
      originalPrice: pricing.originalPrice,
      discount: pricing.discount,
      category,
      sizes,
      description: description || "",
      color: color || "",
      parentProductId: null,
    });
    await syncProductReferences(product);
    invalidateProductsCache();
    const populated = await populateProductMedia(Product.findById(product._id));
    res.status(201).json(applyProductMedia(populated));
  } catch (error) {
    if (error instanceof MediaError) throw error;
    if (error instanceof CatalogValidationError) {
      return res.status(400).json({ message: error.message, details: error.details });
    }
    console.error(error);
    res.status(500).json({ message: "Ürün oluşturulurken hata oluştu." });
  }
};

// Aktif ürün listesi (önbellekte): tam ve kısa JSON ile ana sayfa bölümleri için kısa kayıtlar.
async function buildProductLists() {
  const products = await populateProductMedia(
    Product.find({ archivedAt: null })
      .sort({ createdAt: -1 })
      .select(
        "name video images videoAsset imageAssets price originalPrice discount sizes color category parentProductId createdAt"
      )
  ).lean();
  const full = stripPrivateAssetFields(products.map((product) => applyProductMedia(product, "list")));
  const items = full.map(compactProductListItem);
  return {
    full: prepareJson(full),
    compact: prepareJson(items),
    items,
  };
}

async function loadCompactProducts() {
  return (await productsCache.get(buildProductLists)).items;
}

exports.getProducts = async (req, res) => {
  try {
    if (req.query.varyantsOf) {
      const baseId = req.query.varyantsOf;
      if (!mongoose.isValidObjectId(baseId)) {
        return res.status(400).json({ message: "Geçersiz ürün kimliği." });
      }
      const products = await cachedDetail(`variants:${baseId}`, () =>
        Product.find({
          archivedAt: null,
          $or: [{ _id: baseId }, { parentProductId: baseId }],
        })
          .select("color _id name")
          .lean()
      );
      res.set("Cache-Control", "public, max-age=5, s-maxage=5");
      return res.json(products);
    }
    const result = await productsCache.get(buildProductLists);
    if (req.query.view === "compact") {
      return sendPreparedJson(req, res, result.compact, {
        cacheControl: "public, max-age=5, s-maxage=5",
      });
    }
    return sendPreparedJson(req, res, result.full, { cacheControl: "private, no-cache" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ürünler getirilirken hata oluştu." });
  }
};

exports.getProduct = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Ürün bulunamadı." });
    }
    const prepared = await cachedDetail(`product:${req.params.id}`, async () => {
      const product = await populateProductMedia(
        Product.findOne({ _id: req.params.id, archivedAt: null }).select(
          "video images videoAsset imageAssets price originalPrice discount category sizes description color name parentProductId"
        )
      );
      return product ? prepareJson(stripPrivateAssetFields(applyProductMedia(product, "detail"))) : null;
    });
    if (!prepared) return res.status(404).json({ message: "Ürün bulunamadı." });
    return sendPreparedJson(req, res, prepared, { cacheControl: "public, max-age=5, s-maxage=5" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ürün getirilirken hata oluştu." });
  }
};

exports.invalidateProductsCache = invalidateProductsCache;

const sameSizes = (a, b) =>
  a.length === b.length &&
  a.every(
    (row, i) =>
      row._id &&
      String(row._id) === String(b[i]?._id) &&
      row.size === b[i]?.size &&
      row.stock === Number(b[i]?.stock)
  );

// Beden/stok satırlarını, okunduğu andan beri stok değişmediyse yazar. Ödeme adımındaki
// ayrım, iade veya satış stoğu $inc ile değiştirir; arada biri geldiyse güncel kayıtla
// yeniden hesaplanır, böylece o değişiklik ezilmez.
async function saveProductSizes(productId, parsedSizes, rawSizes) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const fresh = await Product.findById(productId).select("sizes").lean();
    const current = fresh?.sizes || [];
    const plan = planStockEdits(parsedSizes, rawSizes, current);
    if (plan.stale) return { stale: true };
    if (plan.conflicts.length) return { conflicts: plan.conflicts, current };
    if (sameSizes(plan.sizes, current)) return { ok: true };
    const unchanged = { _id: productId, sizes: { $size: current.length } };
    if (current.length) {
      unchanged.$and = current.map((s) => ({
        sizes: { $elemMatch: { _id: s._id, size: s.size, stock: s.stock } },
      }));
    }
    const result = await Product.updateOne(unchanged, { $set: { sizes: plan.sizes } });
    if (result.matchedCount) return { ok: true, wrote: true };
  }
  return { busy: true };
}

exports.updateProduct = async (req, res) => {
  let sizesWritten = false;
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Ürün bulunamadı." });
    const name = requiredText(req.body.name, "Ürün adı");
    const pricing = parseProductPricing({
      price: req.body.price ?? existing.price,
      originalPrice: req.body.originalPrice ?? existing.originalPrice,
    });
    const sizes = req.body.sizes !== undefined ? parseProductSizes(req.body.sizes) : null;
    if (req.body.category && !(await Category.exists({ _id: req.body.category, archivedAt: null }))) {
      return res.status(400).json({ message: "Geçersiz kategori." });
    }

    let imageAssets;
    if (req.body.imageAssetIds !== undefined) {
      imageAssets = await requireReadyAssets(req.body.imageAssetIds, {
        purpose: "product_image",
        kind: "image",
        min: 1,
        max: 6,
      });
    } else {
      imageAssets = await requireReadyAssets(existing.imageAssets, {
        purpose: "product_image",
        kind: "image",
        min: 1,
        max: 6,
      });
    }

    let videoAsset = null;
    if (req.body.videoAssetId === undefined) {
      if (existing.videoAsset) {
        [videoAsset] = await requireReadyAssets([existing.videoAsset], {
          purpose: "product_video",
          kind: "video",
          max: 1,
        });
      }
    } else {
      const videoIds = parseAssetIds(req.body.videoAssetId);
      const videos = await requireReadyAssets(videoIds, {
        purpose: "product_video",
        kind: "video",
        max: 1,
      });
      videoAsset = videos[0] || null;
    }

    existing.name = name;
    existing.price = pricing.price;
    existing.originalPrice = pricing.originalPrice;
    existing.discount = pricing.discount;
    existing.category = req.body.category || existing.category;
    existing.description =
      req.body.description !== undefined ? req.body.description : existing.description;
    existing.color = req.body.color !== undefined ? req.body.color : existing.color;
    existing.imageAssets = imageAssets.map((asset) => asset._id);
    existing.videoAsset = videoAsset?._id || null;
    existing.images = imageAssets.map((asset) => legacyAssetUrl(asset, "detail"));
    existing.video = videoAsset ? legacyAssetUrl(videoAsset, "detail") : "";
    // Diğer alanlar stoktan önce doğrulanır: kayıt yarıda kalıp yalnız stok yazılmasın.
    if (String(existing.color || "").trim().length > 80) {
      throw new CatalogValidationError("Renk en fazla 80 karakter olabilir.");
    }
    await existing.validate();

    // Bedenler ve stok diğer alanlardan önce, ayrı yazılır: stok arada değiştiyse
    // yönetici güncel değeri görür, hiçbir alan kaydedilmez.
    if (sizes) {
      const saved = await saveProductSizes(existing._id, sizes, req.body.sizes);
      sizesWritten = Boolean(saved.wrote);
      if (saved.stale) {
        return res.status(409).json({
          code: "STALE_FORM",
          message: "Yönetim paneli güncellendi. Sayfayı yenileyip ürünü yeniden açın; değişiklik kaydedilmedi.",
        });
      }
      if (saved.conflicts) {
        return res.status(409).json({
          code: "STOCK_CHANGED",
          message: `Siz düzenlerken stok değişti: ${saved.conflicts
            .map((c) => `${c.size || "stok"} şu an ${c.current}`)
            .join(", ")}. Değerleri kontrol edip yeniden kaydedin.`,
          conflicts: saved.conflicts,
          sizes: saved.current,
        });
      }
      if (saved.busy) {
        return res.status(409).json({
          code: "STOCK_BUSY",
          message: "Stok şu anda sık değişiyor. Birkaç saniye sonra yeniden kaydedin.",
        });
      }
    }

    await existing.save();
    await syncProductReferences(existing);
    invalidateProductsCache();
    const populated = await populateProductMedia(Product.findById(existing._id));
    res.json(applyProductMedia(populated));
  } catch (error) {
    // Stok yazıldıysa sonraki adım başarısız olsa da vitrin güncel stoğu göstersin.
    if (sizesWritten) invalidateProductsCache();
    if (error instanceof MediaError) throw error;
    if (error instanceof CatalogValidationError) {
      return res.status(400).json({ message: error.message, details: error.details });
    }
    if (error?.name === "ValidationError") {
      return res.status(400).json({ message: "Ürün bilgileri geçersiz. Alanları kontrol edin." });
    }
    console.error(error);
    res.status(500).json({ message: "Ürün güncellenirken hata oluştu." });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const result = await Product.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ message: "Ürün bulunamadı." });
    await removeOwnerMediaReferences("Product", result._id);
    invalidateProductsCache();
    res.json({ message: "Ürün silindi. Kullanılmayan medyalar bakım alanından temizlenebilir." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Ürün silinirken hata oluştu." });
  }
};

exports.createProductWithNewColor = async (req, res) => {
  try {
    const baseId = req.params.baseProductId;
    const color = String(req.body.color || "").trim();
    if (!color) return res.status(400).json({ message: "Renk zorunludur." });
    const base = await Product.findOne({ _id: baseId, archivedAt: null });
    if (!base) return res.status(404).json({ message: "Ana ürün bulunamadı." });
    const name = requiredText(req.body.name ?? base.name, "Ürün adı");
    const pricing = parseProductPricing({
      price: req.body.price ?? base.price,
      originalPrice: req.body.originalPrice ?? base.originalPrice,
    });
    const sizes =
      req.body.sizes !== undefined
        ? parseProductSizes(req.body.sizes)
        : parseProductSizes(base.sizes);
    const duplicate = await Product.findOne({
      $or: [{ _id: baseId }, { parentProductId: baseId }],
      color: { $regex: new RegExp(`^${escapeRegex(color)}$`, "i") },
    });
    if (duplicate) return res.status(409).json({ message: "Bu renkte varyant zaten var." });

    let imageAssets;
    const requestedImages = parseAssetIds(req.body.imageAssetIds);
    if (requestedImages.length) {
      imageAssets = await requireReadyAssets(requestedImages, {
        purpose: "product_image",
        kind: "image",
        min: 1,
        max: 6,
      });
    } else {
      imageAssets = await requireReadyAssets(base.imageAssets, {
        purpose: "product_image",
        kind: "image",
        min: 1,
        max: 6,
      });
    }
    let videoAsset = null;
    const requestedVideo = parseAssetIds(req.body.videoAssetId);
    if (requestedVideo.length) {
      [videoAsset] = await requireReadyAssets(requestedVideo, {
        purpose: "product_video",
        kind: "video",
        max: 1,
      });
    } else if (base.videoAsset) {
      [videoAsset] = await requireReadyAssets([base.videoAsset], {
        purpose: "product_video",
        kind: "video",
        max: 1,
      });
    }

    const product = await Product.create({
      name,
      price: pricing.price,
      originalPrice: pricing.originalPrice,
      discount: pricing.discount,
      description: req.body.description ?? base.description,
      category: base.category,
      parentProductId: base._id,
      color,
      sizes,
      imageAssets: imageAssets.map((asset) => asset._id),
      videoAsset: videoAsset?._id || null,
      images: imageAssets.map((asset) => legacyAssetUrl(asset, "detail")),
      video: videoAsset ? legacyAssetUrl(videoAsset, "detail") : "",
    });
    await syncProductReferences(product);
    invalidateProductsCache();
    const populated = await populateProductMedia(Product.findById(product._id));
    res.status(201).json(applyProductMedia(populated));
  } catch (error) {
    if (error instanceof MediaError) throw error;
    if (error instanceof CatalogValidationError) {
      return res.status(400).json({ message: error.message, details: error.details });
    }
    console.error("Yeni renk ekleme hatası:", error);
    res.status(500).json({ message: "Yeni renk eklenirken beklenmeyen bir hata oluştu." });
  }
};

exports.loadCompactProducts = loadCompactProducts;
