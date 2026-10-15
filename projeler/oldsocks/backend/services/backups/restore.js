const crypto = require("node:crypto");
const createReadStream = require("node:fs").createReadStream;
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const mongoose = require("mongoose");
const Product = require("../../models/Product");
const Category = require("../../models/Category");
const Order = require("../../models/Order");
const MediaAsset = require("../../models/MediaAsset");
const MediaReference = require("../../models/MediaReference");
const { directoryPath } = require("../media/storage");
const { invalidateProductsCache } = require("../../controllers/productController");
const { invalidateCategoriesCache } = require("../../controllers/categoryController");
const { readDatabaseArchive } = require("./database");
const { restic, withRuntime } = require("./commands");
const { verifyMediaInStage, verifyMediaTree } = require("./media");

const { EJSON } = mongoose.mongo.BSON;
const SNAPSHOT_ID = /^[a-f0-9]{64}$/;
const FIELDS = ["name", "description", "category", "price", "originalPrice", "discount", "color", "sizes", "imageAssets", "imageAsset", "videoAsset", "images", "image", "video", "parentProductId", "parent"];

function httpError(message, statusCode = 409) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function docs(archive, name) {
  const collection = archive.collections.find((entry) => entry.name === name);
  if (!collection) throw new Error(`Yedekte ${name} koleksiyonu yok.`);
  return collection.documents;
}

function id(value) { return String(value?._id || value); }

function stockMap(product) {
  return new Map((product?.sizes || []).map((item) => [String(item.size || ""), Number(item.stock || 0)]));
}

function mergedSizes(snapshot, current) {
  const currentBySize = stockMap(current);
  const snapshotKeys = new Set();
  const sizes = (snapshot.sizes || []).map((item) => {
    const key = String(item.size || "");
    snapshotKeys.add(key);
    return { ...item, stock: current ? (currentBySize.get(key) || 0) : 0 };
  });
  for (const item of current?.sizes || []) {
    if (!snapshotKeys.has(String(item.size || ""))) sizes.push(item);
  }
  return sizes;
}

function fieldChanges(before, after) {
  return FIELDS.filter((field) => {
    const first = field === "sizes" ? (before?.sizes || []).map((size) => size.size) : before?.[field];
    const second = field === "sizes" ? (after?.sizes || []).map((size) => size.size) : after?.[field];
    return EJSON.stringify(first ?? null) !== EJSON.stringify(second ?? null);
  });
}

function fingerprint(products, categories) {
  return crypto.createHash("sha256")
    .update(EJSON.stringify({ products, categories }, { relaxed: false }))
    .digest("hex");
}

function assetIds(products, categories) {
  const values = new Set();
  for (const product of products) {
    for (const asset of product.imageAssets || []) values.add(id(asset));
    if (product.videoAsset) values.add(id(product.videoAsset));
  }
  for (const category of categories) if (category.imageAsset) values.add(id(category.imageAsset));
  return values;
}

async function getSnapshot(settings, snapshotId, action) {
  if (!SNAPSHOT_ID.test(snapshotId)) throw httpError("Geçersiz yedek kimliği.", 400);
  return withRuntime(settings, async (runtime) => {
    const all = JSON.parse(await restic(["snapshots", "--json"], runtime, { timeoutMs: 2 * 60 * 1000 }));
    const snapshot = all.find((item) => item.id === snapshotId &&
      item.tags?.some((tag) => ["oldsocks-production", "oldsocks-pre-restore"].includes(tag)));
    if (!snapshot) throw httpError("Seçilen yedek bulunamadı.", 404);
    if (snapshot.paths?.length !== 1 || !path.isAbsolute(snapshot.paths[0]) ||
        snapshot.paths[0].split(path.sep).includes("..") ||
        !/^oldsocks-backup-stage-[A-Za-z0-9_-]+$/.test(path.basename(snapshot.paths[0]))) {
      throw new Error("Yedek dizini beklenen biçimde değil.");
    }
    const destination = await fs.mkdtemp(path.join(os.tmpdir(), "oldsocks-restore-stage-"));
    await fs.chmod(destination, 0o700);
    try {
      await restic(["restore", snapshotId, "--target", destination], runtime, { timeoutMs: 2 * 60 * 60 * 1000 });
      const restored = path.join(destination, snapshot.paths[0].slice(1));
      const archive = await readDatabaseArchive(path.join(restored, "mongodb.ejson.gz"));
      const tree = await verifyMediaTree(restored);
      const media = { ...(await verifyMediaInStage(archive, restored)), ...tree };
      return await action({ archive, media, restored, snapshot, runtime });
    } finally {
      await fs.rm(destination, { recursive: true, force: true });
    }
  });
}

async function currentCatalog(session = null) {
  const products = await Product.find().sort({ _id: 1 }).session(session).lean();
  const categories = await Category.find().sort({ _id: 1 }).session(session).lean();
  return { products, categories, fingerprint: fingerprint(products, categories) };
}

async function impactReport(archive, media) {
  const catalog = await currentCatalog();
  const oldProducts = docs(archive, "products");
  const oldCategories = docs(archive, "categories");
  const oldMedia = docs(archive, "mediaassets");
  const currentProducts = new Map(catalog.products.map((item) => [id(item), item]));
  const snapshotProducts = new Map(oldProducts.map((item) => [id(item), item]));
  const currentCategories = new Map(catalog.categories.map((item) => [id(item), item]));
  const snapshotCategories = new Map(oldCategories.map((item) => [id(item), item]));
  const currentAssetIds = await MediaAsset.find({}).distinct("_id");
  const currentAssetSet = new Set(currentAssetIds.map(String));
  const oldAssetSet = new Set(oldMedia.map(id));
  const requiredAssetIds = assetIds(oldProducts, oldCategories);
  for (const assetId of requiredAssetIds) {
    if (!oldAssetSet.has(assetId)) throw new Error("Katalogun kullandığı medya kaydı yedekte eksik.");
  }
  const changedProducts = oldProducts.flatMap((item) => {
    const current = currentProducts.get(id(item));
    if (!current) return [];
    const changed = fieldChanges(current, item);
    return changed.length ? [{
      id: id(item), name: item.name, fields: changed,
      before: { name: current.name, price: current.price, originalPrice: current.originalPrice, categoryId: id(current.category), imageCount: (current.imageAssets || []).length },
      after: { name: item.name, price: item.price, originalPrice: item.originalPrice, categoryId: id(item.category), imageCount: (item.imageAssets || []).length },
    }] : [];
  });
  const newerProducts = catalog.products.filter((item) => !snapshotProducts.has(id(item)))
    .map((item) => ({ id: id(item), name: item.name, stock: [...stockMap(item).values()].reduce((sum, qty) => sum + qty, 0) }));
  const restoredProducts = oldProducts.filter((item) => !currentProducts.has(id(item)))
    .map((item) => ({ id: id(item), name: item.name, stockAfterRestore: 0 }));
  const changedCategories = oldCategories.flatMap((item) => {
    const current = currentCategories.get(id(item));
    if (!current) return [];
    const changed = fieldChanges(current, item);
    return changed.length ? [{ id: id(item), name: item.name, fields: changed, beforeName: current.name }] : [];
  });
  return {
    snapshotAt: archive.createdAt,
    currentFingerprint: catalog.fingerprint,
    products: {
      changed: changedProducts,
      newerHidden: newerProducts,
      restoredWithZeroStock: restoredProducts,
      stockPreservedForExisting: oldProducts.filter((item) => currentProducts.has(id(item))).length,
    },
    categories: {
      changed: changedCategories,
      newerHidden: catalog.categories.filter((item) => !snapshotCategories.has(id(item)))
        .map((item) => ({ id: id(item), name: item.name })),
      restored: oldCategories.filter((item) => !currentCategories.has(id(item)))
        .map((item) => ({ id: id(item), name: item.name })),
    },
    media: {
      readyAssetsChecked: media.readyAssets,
      referencedFilesChecked: media.referencedFiles,
      historicAssetRecordsToRestore: [...oldAssetSet].filter((assetId) => !currentAssetSet.has(assetId)).length,
      newerAssetRecordsPreserved: [...currentAssetSet].filter((assetId) => !oldAssetSet.has(assetId)).length,
    },
    ordersPreserved: await Order.countDocuments(),
  };
}

async function copyMissingMedia(source, destination) {
  let copied = 0;
  async function digest(file) {
    const hash = crypto.createHash("sha256");
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    return hash.digest("hex");
  }
  async function walk(relative = "") {
    for (const entry of await fs.readdir(path.join(source, relative), { withFileTypes: true })) {
      if (!/^[A-Za-z0-9._-]+$/.test(entry.name) || entry.name === "." || entry.name === "..") {
        throw new Error("Geçersiz medya dosya adı.");
      }
      const next = path.join(relative, entry.name);
      if (entry.isDirectory()) { await walk(next); continue; }
      if (!entry.isFile()) throw new Error("Yedekte beklenmeyen medya dosyası türü.");
      const target = path.join(destination, next);
      await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o750 });
      try {
        await fs.copyFile(path.join(source, next), target, fs.constants.COPYFILE_EXCL);
        copied += 1;
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        const existing = await fs.lstat(target);
        if (!existing.isFile()) throw new Error("Canlı medya yolunda beklenmeyen dosya türü.");
        const original = await fs.stat(path.join(source, next));
        if (existing.size !== original.size ||
            await digest(target) !== await digest(path.join(source, next))) {
          throw new Error("Canlı medya dosyası yedekteki aynı adlı dosyayla uyuşmuyor.");
        }
      }
    }
  }
  await walk();
  return copied;
}

function referenceDocs(ownerType, owner) {
  const refs = [];
  const add = (asset, field, position) => {
    if (asset) refs.push({ asset, ownerType, ownerId: owner._id, field, position });
  };
  if (ownerType === "Product") {
    (owner.imageAssets || []).forEach((asset, index) => add(asset, "images", index));
    add(owner.videoAsset, "video", 0);
  } else add(owner.imageAsset, "image", 0);
  return refs;
}

async function applyCatalog(archive, expectedFingerprint) {
  const oldProducts = docs(archive, "products");
  const oldCategories = docs(archive, "categories");
  const oldMedia = docs(archive, "mediaassets");
  const oldProductIds = oldProducts.map((item) => item._id);
  const oldCategoryIds = oldCategories.map((item) => item._id);
  const requiredAssetIds = assetIds(oldProducts, oldCategories);
  const requiredAssets = oldMedia;
  if ([...requiredAssetIds].some((assetId) => !oldMedia.some((item) => id(item) === assetId))) {
    throw new Error("Geri yükleme medyası eksik.");
  }
  const now = new Date();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const catalog = await currentCatalog(session);
      if (catalog.fingerprint !== expectedFingerprint) {
        throw httpError("Katalog önizlemeden sonra değişti. Raporu yeniden hazırlayın.");
      }
      const currentProducts = new Map(catalog.products.map((item) => [id(item), item]));
      for (const asset of requiredAssets) {
        if (requiredAssetIds.has(id(asset))) {
          const current = await MediaAsset.findById(asset._id).session(session).lean();
          await MediaAsset.collection.replaceOne(
            { _id: asset._id },
            { ...asset, backup: current?.backup || asset.backup, referenceCount: current?.referenceCount || 0 },
            { upsert: true, session }
          );
        } else {
          await MediaAsset.collection.updateOne({ _id: asset._id }, { $setOnInsert: asset }, { upsert: true, session });
        }
      }
      for (const category of oldCategories) {
        await Category.collection.replaceOne({ _id: category._id }, { ...category, archivedAt: category.archivedAt || null }, { upsert: true, session });
      }
      await Category.collection.updateMany({ _id: { $nin: oldCategoryIds }, archivedAt: null }, { $set: { archivedAt: now } }, { session });
      await Category.collection.updateMany({ _id: { $nin: oldCategoryIds }, archivedAt: { $exists: false } }, { $set: { archivedAt: now } }, { session });
      for (const product of oldProducts) {
        await Product.collection.replaceOne(
          { _id: product._id },
          { ...product, sizes: mergedSizes(product, currentProducts.get(id(product))), archivedAt: product.archivedAt || null },
          { upsert: true, session }
        );
      }
      await Product.collection.updateMany({ _id: { $nin: oldProductIds }, archivedAt: null }, { $set: { archivedAt: now } }, { session });
      await Product.collection.updateMany({ _id: { $nin: oldProductIds }, archivedAt: { $exists: false } }, { $set: { archivedAt: now } }, { session });
      await MediaReference.collection.deleteMany({
        $or: [
          { ownerType: "Product", ownerId: { $in: oldProductIds } },
          { ownerType: "Category", ownerId: { $in: oldCategoryIds } },
        ],
      }, { session });
      const references = [
        ...oldProducts.flatMap((item) => referenceDocs("Product", item)),
        ...oldCategories.flatMap((item) => referenceDocs("Category", item)),
      ];
      if (references.length) await MediaReference.collection.insertMany(references, { session });
    });
  } finally {
    await session.endSession();
  }
  invalidateProductsCache();
  invalidateCategoriesCache();
  const counts = await MediaReference.aggregate([
    { $match: { asset: { $in: requiredAssets.map((item) => item._id) } } },
    { $group: { _id: "$asset", count: { $sum: 1 } } },
  ]);
  const countById = new Map(counts.map((item) => [id(item), item.count]));
  if (requiredAssets.length) await MediaAsset.bulkWrite(requiredAssets.map((item) => ({
    updateOne: { filter: { _id: item._id }, update: { $set: { referenceCount: countById.get(id(item)) || 0 } } },
  })));
}

module.exports = { applyCatalog, copyMissingMedia, currentCatalog, getSnapshot, impactReport, mergedSizes };
