const mongoose = require("mongoose");
const Discount = require("../models/Discount");
const Product = require("../models/Product");
const Category = require("../models/Category");

/* ================== Yardımcılar ================== */

const oid = (x) => new mongoose.Types.ObjectId(String(x || ""));

// Kök kategorilerden tüm alt dalları (descendants) topla
async function getDescendantCategoryIds(rootIds) {
  const seen = new Set(rootIds.map(String));
  let frontier = [...rootIds];

  while (frontier.length) {
    const children = await Category.find({ parent: { $in: frontier } })
      .select("_id")
      .lean();
    const newOnes = [];
    for (const c of children) {
      const id = String(c._id);
      if (!seen.has(id)) {
        seen.add(id);
        newOnes.push(c._id);
      }
    }
    frontier = newOnes;
  }
  return Array.from(seen).map((s) => new mongoose.Types.ObjectId(s));
}

// Kurala göre etkilenen ürün id’lerini getir
async function getAffectedProductIds(rule) {
  if (rule.selectionType === "product") {
    return rule.targetIds;
  }

  if (rule.selectionType === "subcategory") {
    const prods = await Product.find({
      category: { $in: rule.targetIds },
    }).select("_id");
    return prods.map((p) => p._id);
  }

  if (rule.selectionType === "category") {
    const allCats = await getDescendantCategoryIds(rule.targetIds);
    const prods = await Product.find({ category: { $in: allCats } }).select(
      "_id"
    );
    return prods.map((p) => p._id);
  }

  return [];
}

// Çakışma: başka aktif indirim aynı ürünü tutuyor mu?
async function findConflicts(discountId, targetProductIds) {
  const others = await Discount.find({
    _id: { $ne: discountId },
    isActive: true,
  })
    .select("appliedProducts.product")
    .lean();
  const locked = new Set(
    others.flatMap((d) =>
      (d.appliedProducts || []).map((ap) => String(ap.product))
    )
  );
  const conflicts = targetProductIds.filter((id) => locked.has(String(id)));
  return conflicts;
}

/* ================== Uygula / Geri Al ================== */

const { invalidateCatalog } = require("../services/catalogCache");

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

function discountPercent(price, originalPrice) {
  return originalPrice > 0 && price < originalPrice
    ? round2(100 - (price / originalPrice) * 100)
    : 0;
}

function conflictError(conflicts) {
  const err = new Error("Çakışan aktif indirim(ler) var.");
  err.status = 409;
  err.details = { conflictingProductIds: conflicts };
  return err;
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function validateRule(rule) {
  if (!String(rule.title || "").trim()) throw badRequest("İndirim adı zorunlu.");
  const rate = Number(rule.discountRate);
  if (!Number.isFinite(rate) || rate <= 0 || rate >= 100) {
    throw badRequest("İndirim yüzdesi 0'dan büyük, 100'den küçük olmalı.");
  }
  if (!["product", "category", "subcategory"].includes(rule.selectionType)) {
    throw badRequest("Geçersiz selectionType.");
  }
  if (!Array.isArray(rule.targetIds) || rule.targetIds.length === 0) {
    throw badRequest("targetIds boş olamaz.");
  }
}

function parseTargetIds(value) {
  if (!Array.isArray(value)) throw badRequest("targetIds boş olamaz.");
  return value.map((id) => {
    if (!mongoose.isValidObjectId(id)) throw badRequest("Geçersiz hedef kimliği.");
    return oid(id);
  });
}

// Kural ürünün fiyat alanlarını değiştirir ama önceki satış fiyatını saklar.
// Kural hiçbir ürünün fiyatını yükseltmez: elle girilmiş fiyat zaten daha
// düşükse o fiyat korunur.
async function applyToProducts(productIds, rate, session) {
  if (!productIds.length) return [];
  const products = await Product.find({ _id: { $in: productIds } })
    .select("_id price originalPrice discount")
    .session(session)
    .lean();
  const factor = (100 - rate) / 100;
  const entries = products.map((p) => {
    const originalPrice = Number(p.originalPrice || 0);
    const previousPrice = Number(p.price || 0);
    const appliedPrice = Math.min(previousPrice, round2(originalPrice * factor));
    return {
      product: p._id,
      previousDiscount: Number(p.discount || 0),
      previousPrice,
      appliedPrice,
      originalPrice,
    };
  });
  await Product.bulkWrite(
    entries.map((e) => ({
      updateOne: {
        filter: { _id: e.product },
        update: {
          $set: {
            price: e.appliedPrice,
            discount: discountPercent(e.appliedPrice, e.originalPrice),
          },
        },
      },
    })),
    { session }
  );
  return entries.map(({ originalPrice: _omit, ...entry }) => entry);
}

// Kuralın yazdığı fiyat hâlâ yerindeyse önceki fiyatı geri koyar. Kural açıkken
// fiyat elle değiştirildiyse yöneticinin girdiği fiyata dokunulmaz.
async function revertProducts(entries, session) {
  if (!entries.length) return;
  const products = await Product.find({ _id: { $in: entries.map((e) => e.product) } })
    .select("_id price originalPrice")
    .session(session)
    .lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const ops = [];
  for (const entry of entries) {
    const product = byId.get(String(entry.product));
    if (!product) continue;
    const originalPrice = Number(product.originalPrice || 0);
    let restored;
    if (entry.previousPrice == null) {
      // Bu sürümden önce uygulanmış kural: eski hesapla geri al.
      restored = round2(originalPrice * ((100 - Number(entry.previousDiscount || 0)) / 100));
    } else if (round2(product.price) === round2(entry.appliedPrice)) {
      restored = Math.min(Number(entry.previousPrice), originalPrice);
    } else {
      continue;
    }
    ops.push({
      updateOne: {
        filter: { _id: product._id },
        update: { $set: { price: restored, discount: discountPercent(restored, originalPrice) } },
      },
    });
  }
  if (ops.length) await Product.bulkWrite(ops, { session });
}

async function inTransaction(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

// Kuralın ürünlere yansımasını baştan kurar: eski uygulamayı geri alır, kural
// aktifse güncel hedeflere yeniden uygular, kuralı kaydeder. Hepsi tek işlemde.
async function syncRule(rule, { wasApplied }) {
  let productIds = [];
  if (rule.isActive) {
    productIds = await getAffectedProductIds(rule);
    const conflicts = await findConflicts(rule._id, productIds);
    if (conflicts.length) throw conflictError(conflicts);
  }
  const previous = wasApplied ? (rule.appliedProducts || []).map((e) => e.toObject?.() ?? e) : [];
  await inTransaction(async (session) => {
    await revertProducts(previous, session);
    rule.appliedProducts = rule.isActive
      ? await applyToProducts(productIds, Number(rule.discountRate), session)
      : [];
    await rule.save({ session });
  });
  invalidateCatalog();
  return rule;
}

function sendError(res, err, fallback, label) {
  if (err.status === 409) return res.status(409).json({ message: err.message, ...err.details });
  if (err.status === 400) return res.status(400).json({ message: err.message });
  console.error(`${label} error:`, err);
  return res.status(500).json({ message: fallback });
}

/* ================== CRUD ================== */

// POST /discounts
exports.createDiscount = async (req, res) => {
  try {
    const { title, discountRate, selectionType, targetIds, isActive = false } = req.body || {};
    const doc = new Discount({
      title: String(title || "").trim(),
      discountRate: Number(discountRate),
      selectionType,
      targetIds: parseTargetIds(targetIds),
      isActive: Boolean(isActive),
      appliedProducts: [],
    });
    validateRule(doc);
    await syncRule(doc, { wasApplied: false });
    res.status(201).json(doc);
  } catch (err) {
    sendError(res, err, "İndirim oluşturulamadı.", "createDiscount");
  }
};

// GET /discounts
exports.listDiscounts = async (_req, res) => {
  const list = await Discount.find().sort("-createdAt");
  res.json(list);
};

// GET /discounts/:id
exports.getDiscount = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: "İndirim bulunamadı." });
  }
  const d = await Discount.findById(req.params.id);
  if (!d) return res.status(404).json({ message: "İndirim bulunamadı." });
  res.json(d);
};

// PUT /discounts/:id  (alanları güncelle + uzlaştır)
exports.updateDiscount = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "İndirim bulunamadı." });
    }
    const d = await Discount.findById(req.params.id);
    if (!d) return res.status(404).json({ message: "İndirim bulunamadı." });

    const wasApplied = Boolean(d.appliedProducts?.length);
    const body = req.body || {};
    if (body.title !== undefined) d.title = String(body.title || "").trim();
    if (body.discountRate !== undefined) d.discountRate = Number(body.discountRate);
    if (body.selectionType !== undefined) d.selectionType = body.selectionType;
    if (body.targetIds !== undefined) d.targetIds = parseTargetIds(body.targetIds);
    if (body.isActive !== undefined) d.isActive = Boolean(body.isActive);
    validateRule(d);

    await syncRule(d, { wasApplied });
    res.json(d);
  } catch (err) {
    sendError(res, err, "İndirim güncellenemedi.", "updateDiscount");
  }
};

// PUT /discounts/:id/toggle  { isActive: true/false }
exports.toggleDiscount = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "İndirim bulunamadı." });
    }
    const d = await Discount.findById(req.params.id);
    if (!d) return res.status(404).json({ message: "İndirim bulunamadı." });

    const wasApplied = Boolean(d.appliedProducts?.length);
    d.isActive = Boolean(req.body?.isActive);
    await syncRule(d, { wasApplied });
    res.json(d);
  } catch (err) {
    sendError(res, err, "İndirim güncellenemedi.", "toggleDiscount");
  }
};

// DELETE /discounts/:id
exports.deleteDiscount = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "İndirim bulunamadı." });
    }
    const d = await Discount.findById(req.params.id);
    if (!d) return res.status(404).json({ message: "İndirim bulunamadı." });

    const applied = (d.appliedProducts || []).map((e) => e.toObject?.() ?? e);
    await inTransaction(async (session) => {
      await revertProducts(applied, session);
      await Discount.deleteOne({ _id: d._id }, { session });
    });
    invalidateCatalog();
    res.json({ message: "İndirim silindi." });
  } catch (err) {
    sendError(res, err, "İndirim silinemedi.", "deleteDiscount");
  }
};
