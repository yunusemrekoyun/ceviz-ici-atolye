const mongoose = require("mongoose");
const StorefrontSettings = require("../models/StorefrontSettings");
const Product = require("../models/Product");
const Category = require("../models/Category");
const Order = require("../models/Order");
const { timedCache } = require("../services/timedCache");
const { loadCompactProducts } = require("./productController");

const defaults = Object.freeze({
  fontPreset: "classic",
  heroButtonOpacity: 30,
  sectionOrder: ["new", "featured", "popular"],
  sections: {
    new: { heading: "Yeni Eklenen Ürünler", source: "latest", categoryId: null, productIds: [], shuffle: true, visible: true },
    featured: { heading: "Öne Çıkan Ürünler", source: "random", categoryId: null, productIds: [], shuffle: true, visible: true },
    popular: { heading: "Çok Satan Ürünler", source: "best_selling", categoryId: null, productIds: [], shuffle: false, visible: true },
  },
  cartRecommendations: {
    visible: true,
    heading: "Sepetinize yakışabilecek ürünler",
    productIds: [],
  },
  similarProductsVisible: true,
});
const sectionKeys = ["new", "featured", "popular"];
const validSectionOrder = (order) => Array.isArray(order)
  && order.length === sectionKeys.length
  && sectionKeys.every((key) => order.includes(key))
  && new Set(order).size === sectionKeys.length;
const sources = new Set(["latest", "best_selling", "category", "manual", "random"]);
const fonts = new Set(["classic", "modern", "fashion"]);
const settingsCache = timedCache(30_000);
const bestSellersCache = timedCache(5 * 60_000);

function publicSettings(doc) {
  if (!doc) return defaults;
  const value = doc.toObject ? doc.toObject() : doc;
  return {
    fontPreset: value.fontPreset,
    heroButtonOpacity: value.heroButtonOpacity ?? defaults.heroButtonOpacity,
    sectionOrder: validSectionOrder(value.sectionOrder) ? value.sectionOrder : defaults.sectionOrder,
    cartRecommendations: {
      visible: value.cartRecommendations?.visible !== false,
      heading: value.cartRecommendations?.heading || defaults.cartRecommendations.heading,
      productIds: (value.cartRecommendations?.productIds || []).map(String),
    },
    similarProductsVisible: value.similarProductsVisible !== false,
    sections: Object.fromEntries(sectionKeys.map((key) => {
      const section = value.sections[key];
      return [key, {
        heading: section.heading,
        source: section.source,
        categoryId: section.categoryId ? String(section.categoryId) : null,
        productIds: section.productIds.map(String),
        shuffle: section.shuffle,
        visible: section.visible !== false,
      }];
    })),
  };
}

async function loadSettings() {
  return settingsCache.get(async () => publicSettings(await StorefrontSettings.findOne({ key: "main" })));
}

async function bestSellerIds() {
  return bestSellersCache.get(async () => {
    const rows = await Order.aggregate([
      { $match: { status: { $in: ["paid", "shipped", "completed"] } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.productId", quantity: { $sum: "$items.qty" } } },
      { $sort: { quantity: -1, _id: 1 } },
    ]);
    const active = await Product.find({
      _id: { $in: rows.map((row) => row._id) },
      archivedAt: null,
    }).select("_id").lean();
    const activeIds = new Set(active.map((product) => String(product._id)));
    return rows.map((row) => String(row._id)).filter((id) => activeIds.has(id)).slice(0, 40);
  });
}

exports.getPublic = async (_req, res) => {
  const settings = await loadSettings();
  const needsSales = sectionKeys.some((key) => settings.sections[key].visible && settings.sections[key].source === "best_selling");
  const bestSellingProductIds = needsSales ? await bestSellerIds() : [];
  res.set("Cache-Control", "public, max-age=5, s-maxage=5");
  res.json({ ...settings, bestSellingProductIds });
};

// Ana sayfa bölümleri için yalnız gereken ürünler: her bölümün aday havuzu (en çok
// HOME_POOL_SIZE) ve bu ürünlerin renk varyantları. Karıştırma ve 4 ürün seçimi
// tarayıcıda yapılır; ana sayfa tüm ürün listesini indirmez.
const HOME_POOL_SIZE = 12;

function productTime(product) {
  if (product.createdAt) return new Date(product.createdAt).getTime() || 0;
  return Number.parseInt(String(product._id || "").slice(0, 8), 16) * 1000 || 0;
}

function sample(items, size) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, size);
}

function sectionPool(all, byId, section, bestSelling) {
  switch (section.source) {
    case "manual":
      return section.productIds.map((id) => byId.get(String(id))).filter(Boolean).slice(0, HOME_POOL_SIZE);
    case "category":
      return all
        .filter((product) => {
          const category = product.category;
          const id = typeof category === "object" ? category?._id : category;
          const parent = typeof category === "object" ? category?.parent?._id || category?.parent : null;
          return [id, parent].some((value) => String(value || "") === String(section.categoryId));
        })
        .sort((a, b) => productTime(b) - productTime(a))
        .slice(0, HOME_POOL_SIZE);
    case "best_selling":
      return bestSelling.map((id) => byId.get(String(id))).filter(Boolean).slice(0, HOME_POOL_SIZE);
    case "random":
      return sample(all, HOME_POOL_SIZE);
    case "latest":
    default:
      return [...all].sort((a, b) => productTime(b) - productTime(a)).slice(0, 10);
  }
}

// Ana sayfa kartının kullandığı alanlar: ilk görsel, fiyatlar, stok ve renk.
function homeCard(product) {
  return {
    _id: product._id,
    name: product.name,
    price: product.price,
    originalPrice: product.originalPrice,
    discount: product.discount,
    video: product.video || "",
    color: product.color || "",
    parentProductId: product.parentProductId || null,
    sizes: (product.sizes || []).map((row) => ({ size: row.size, stock: row.stock })),
    images: (product.images || []).slice(0, 1),
    media: { images: (product.media?.images || []).slice(0, 1) },
  };
}

const variantBase = (product) => String(product.parentProductId?._id || product.parentProductId || product._id);

exports.getHomeProducts = async (_req, res) => {
  const [settings, all] = await Promise.all([loadSettings(), loadCompactProducts()]);
  const visible = sectionKeys.filter((key) => settings.sections[key].visible);
  const needsSales = visible.some((key) => settings.sections[key].source === "best_selling");
  const bestSelling = needsSales ? await bestSellerIds() : [];
  const byId = new Map(all.map((product) => [String(product._id), product]));
  const pools = Object.fromEntries(visible.map((key) => [key, sectionPool(all, byId, settings.sections[key], bestSelling)]));
  const bases = new Set(Object.values(pools).flat().map(variantBase));
  const sections = Object.fromEntries(Object.entries(pools).map(([key, pool]) => [key, pool.map(homeCard)]));
  const variants = all
    .filter((product) => bases.has(variantBase(product)) && String(product.color || "").trim())
    .map((product) => ({ _id: product._id, color: product.color, parentProductId: product.parentProductId || null }));
  res.set("Cache-Control", "public, max-age=5, s-maxage=5");
  res.json({ sections, variants });
};

exports.getAdmin = async (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json(await loadSettings());
};

exports.update = async (req, res) => {
  const input = req.body || {};
  const currentSettings = await loadSettings();
  if (!fonts.has(input.fontPreset)) {
    return res.status(400).json({ message: "Yazı ailesi geçersiz." });
  }
  const heroButtonOpacity = Number(input.heroButtonOpacity ?? currentSettings.heroButtonOpacity);
  if (!Number.isInteger(heroButtonOpacity) || heroButtonOpacity < 0 || heroButtonOpacity > 100) {
    return res.status(400).json({ message: "Hero buton opaklığı 0–100 arasında olmalıdır." });
  }
  const sectionOrder = input.sectionOrder ?? currentSettings.sectionOrder;
  if (!validSectionOrder(sectionOrder)) {
    return res.status(400).json({ message: "Ürün alanlarının sırası geçersiz." });
  }
  const sections = {};
  const recommendationsInput = input.cartRecommendations ?? currentSettings.cartRecommendations;
  const similarProductsVisible = input.similarProductsVisible ?? currentSettings.similarProductsVisible;
  if (typeof similarProductsVisible !== "boolean") {
    return res.status(400).json({ message: "Benzer ürünler görünürlük ayarı geçersiz." });
  }
  const recommendationsVisible = recommendationsInput?.visible;
  const recommendationsHeading = String(recommendationsInput?.heading || "").trim();
  const recommendationProductIds = recommendationsInput?.productIds;
  if (typeof recommendationsVisible !== "boolean"
    || !recommendationsHeading || recommendationsHeading.length > 80
    || !Array.isArray(recommendationProductIds) || recommendationProductIds.length > 12
    || recommendationProductIds.some((id) => !mongoose.isValidObjectId(id))
    || new Set(recommendationProductIds.map(String)).size !== recommendationProductIds.length) {
    return res.status(400).json({ message: "Sepet önerisi ayarları geçersiz." });
  }
  for (const key of sectionKeys) {
    const row = input.sections?.[key];
    const heading = String(row?.heading || "").trim();
    const source = row?.source;
    const categoryId = row?.categoryId || null;
    const productIds = Array.isArray(row?.productIds) ? row.productIds : [];
    const visible = row?.visible ?? currentSettings.sections[key].visible;
    if (!heading || heading.length > 80 || !sources.has(source)) {
      return res.status(400).json({ message: `${key} alanının başlığı veya kaynağı geçersiz.` });
    }
    if (typeof visible !== "boolean") {
      return res.status(400).json({ message: `${key} görünürlük ayarı geçersiz.` });
    }
    if (visible && source === "category" && !mongoose.isValidObjectId(categoryId)) {
      return res.status(400).json({ message: `${key} için kategori seçin.` });
    }
    if (source === "manual" && (productIds.length > 40 || (visible && !productIds.length))) {
      return res.status(400).json({ message: `${key} için 1–40 ürün seçin.` });
    }
    if (productIds.some((id) => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: `${key} ürün seçimi geçersiz.` });
    }
    sections[key] = {
      heading,
      source,
      categoryId: source === "category" && mongoose.isValidObjectId(categoryId) ? categoryId : null,
      productIds: source === "manual" ? [...new Set(productIds)] : [],
      shuffle: Boolean(row.shuffle),
      visible,
    };
  }

  for (const key of sectionKeys) {
    const row = sections[key];
    if (row.visible && row.source === "category" && !(await Category.exists({ _id: row.categoryId, archivedAt: null }))) {
      return res.status(400).json({ message: `${key} kategorisi bulunamadı.` });
    }
    if (row.visible && row.source === "manual") {
      const count = await Product.countDocuments({ _id: { $in: row.productIds }, archivedAt: null });
      if (count !== row.productIds.length) {
        return res.status(400).json({ message: `${key} içindeki ürünlerden biri bulunamadı.` });
      }
    }
  }

  if (recommendationsVisible && recommendationProductIds.length) {
    const count = await Product.countDocuments({ _id: { $in: recommendationProductIds }, archivedAt: null });
    if (count !== recommendationProductIds.length) {
      return res.status(400).json({ message: "Sepet önerilerindeki ürünlerden biri bulunamadı." });
    }
  }

  const doc = await StorefrontSettings.findOneAndUpdate(
    { key: "main" },
    { $set: { fontPreset: input.fontPreset, heroButtonOpacity, sectionOrder, sections, similarProductsVisible,
      cartRecommendations: { visible: recommendationsVisible, heading: recommendationsHeading, productIds: recommendationProductIds } } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  settingsCache.invalidate();
  res.set("Cache-Control", "no-store");
  res.json(publicSettings(doc));
};
