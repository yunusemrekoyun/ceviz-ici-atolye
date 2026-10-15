const Category = require("../models/Category");
const Product = require("../models/Product");
const { MediaError } = require("../services/media/errors");
const { timedCache } = require("../services/timedCache");
const { invalidateCatalog } = require("../services/catalogCache");
const {
  legacyAssetUrl,
  publicAsset,
  removeOwnerMediaReferences,
  requireReadyAssets,
  syncOwnerMediaReferences,
} = require("../services/media/assets");

const categoriesCache = timedCache(60 * 1000);

function invalidateCategoriesCache() {
  categoriesCache.invalidate();
  // Ürün yanıtları kategori adını ve görselini gömer.
  invalidateCatalog();
}

function parseChildren(value) {
  if (Array.isArray(value)) return value.map(String).map((v) => v.trim()).filter(Boolean);
  return String(value || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function applyCategoryMedia(category) {
  const value = typeof category?.toObject === "function" ? category.toObject() : { ...category };
  if (value.imageAsset && typeof value.imageAsset === "object") {
    value.image = legacyAssetUrl(value.imageAsset, "list");
    value.media = publicAsset(value.imageAsset, "list");
    value.imageAssetId = String(value.imageAsset._id);
  }
  if (Array.isArray(value.children)) {
    value.children = value.children.map(applyCategoryMedia);
  }
  return value;
}

function populatedCategory(query) {
  return query
    .populate("imageAsset")
    .populate({ path: "children", match: { archivedAt: null }, select: "name image imageAsset parent", populate: "imageAsset" })
    .populate("parent", "name");
}

async function syncCategory(category) {
  await syncOwnerMediaReferences({
    ownerType: "Category",
    ownerId: category._id,
    fields: { image: category.imageAsset ? [category.imageAsset] : [] },
  });
}

exports.getCategories = async (_req, res) => {
  try {
    const result = await categoriesCache.get(async () => {
      const roots = await populatedCategory(Category.find({ parent: null, archivedAt: null }).sort("name")).lean();
      return roots.map(applyCategoryMedia);
    });
    res.set("Cache-Control", "public, max-age=5, s-maxage=5");
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Kategoriler getirilirken hata oluştu." });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const category = await populatedCategory(Category.findOne({ _id: req.params.id, archivedAt: null }));
    if (!category) return res.status(404).json({ message: "Kategori bulunamadı." });
    res.json(applyCategoryMedia(category));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Kategori getirilirken hata oluştu." });
  }
};

exports.invalidateCategoriesCache = invalidateCategoriesCache;

exports.createCategory = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Kategori adı zorunludur." });
    const [imageAsset] = await requireReadyAssets(req.body.imageAssetId, {
      purpose: "category_image",
      kind: "image",
      min: 1,
      max: 1,
    });
    const legacyUrl = legacyAssetUrl(imageAsset, "list");
    const root = await Category.create({
      name,
      image: legacyUrl,
      imageAsset: imageAsset._id,
      parent: null,
    });
    await syncCategory(root);
    for (const childName of parseChildren(req.body.children)) {
      const child = await Category.create({
        name: childName,
        image: legacyUrl,
        imageAsset: imageAsset._id,
        parent: root._id,
      });
      await syncCategory(child);
    }
    const populated = await populatedCategory(Category.findById(root._id));
    invalidateCategoriesCache();
    res.status(201).json(applyCategoryMedia(populated));
  } catch (error) {
    if (error instanceof MediaError) throw error;
    console.error(error);
    res.status(500).json({ message: "Kategori oluşturulurken hata oluştu." });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Kategori bulunamadı." });
    if (typeof req.body.name === "string") category.name = req.body.name.trim();
    let imageAsset = null;
    if (req.body.imageAssetId !== undefined) {
      [imageAsset] = await requireReadyAssets(req.body.imageAssetId, {
        purpose: "category_image",
        kind: "image",
        min: 1,
        max: 1,
      });
      category.imageAsset = imageAsset._id;
      category.image = legacyAssetUrl(imageAsset, "list");
    }
    await category.save();
    await syncCategory(category);

    const blocked = [];
    if (req.body.children !== undefined) {
      const desiredNames = parseChildren(req.body.children);
      const desiredSet = new Set(desiredNames.map((name) => name.toLocaleLowerCase("tr-TR")));
      const existing = await Category.find({ parent: category._id });
      const byName = new Map(
        existing.map((item) => [item.name.toLocaleLowerCase("tr-TR"), item])
      );
      for (const childName of desiredNames) {
        if (byName.has(childName.toLocaleLowerCase("tr-TR"))) continue;
        const child = await Category.create({
          name: childName,
          image: category.image,
          imageAsset: category.imageAsset,
          parent: category._id,
        });
        await syncCategory(child);
      }
      for (const child of existing) {
        if (desiredSet.has(child.name.toLocaleLowerCase("tr-TR"))) {
          if (imageAsset) {
            child.image = category.image;
            child.imageAsset = category.imageAsset;
            await child.save();
            await syncCategory(child);
          }
          continue;
        }
        if (await Product.exists({ category: child._id })) {
          blocked.push({ id: String(child._id), name: child.name });
          continue;
        }
        await Category.deleteOne({ _id: child._id });
        await removeOwnerMediaReferences("Category", child._id);
      }
    }

    const populated = await populatedCategory(Category.findById(category._id));
    invalidateCategoriesCache();
    if (blocked.length) {
      const blockedIds = blocked.map((item) => item.id);
      const products = await Product.find({ category: { $in: blockedIds } })
        .select("_id name images category")
        .limit(12 * blockedIds.length)
        .lean();
      return res.status(409).json({
        message:
          "Bazı alt kategoriler ürüne bağlı olduğu için silinmedi. Önce ürünleri taşıyın.",
        blocked,
        products,
        category: applyCategoryMedia(populated),
      });
    }
    res.json(applyCategoryMedia(populated));
  } catch (error) {
    if (error instanceof MediaError) throw error;
    console.error(error);
    res.status(500).json({ message: "Kategori güncellenirken hata oluştu." });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: "Kategori bulunamadı." });
    const children = await Category.find({ parent: category._id });
    const ids = [category._id, ...children.map((child) => child._id)];
    if (await Product.exists({ category: { $in: ids } })) {
      return res.status(409).json({
        message: "Bu kategoriye bağlı ürünler varken kategori silinemez.",
      });
    }
    await Category.deleteMany({ _id: { $in: ids } });
    for (const id of ids) await removeOwnerMediaReferences("Category", id);
    invalidateCategoriesCache();
    res.json({ message: "Kategori silindi." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Kategori silinirken hata oluştu." });
  }
};
