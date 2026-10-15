const express = require("express");
const router = express.Router();
const Category = require("../models/Category.js");
const Product = require("../models/Product.js");
const authMiddleware = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/requireAdmin");
const { HttpError, asyncHandler, exactMatch } = require("../utils/http");

const cleanText = (value) => (typeof value === "string" ? value.trim() : "");

// Boş ve (büyük/küçük harf duyarsız) tekrar eden markaları temizler
const cleanBrands = (brands) => {
  if (!Array.isArray(brands)) return [];
  const seen = new Set();
  return brands.map(cleanText).filter((b) => {
    const key = b.toLocaleLowerCase("tr");
    if (!b || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const ensureUniqueName = async (name, exceptId) => {
  const existing = await Category.findOne({ name: exactMatch(name) });
  if (existing && String(existing._id) !== String(exceptId)) {
    throw new HttpError(409, "Bu isimde bir kategori zaten var.");
  }
};

// Yeni Kategori Oluşturma
router.post(
  "/",
  authMiddleware,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const name = cleanText(req.body.name);
    if (!name) throw new HttpError(400, "Kategori adı zorunludur.");
    await ensureUniqueName(name);

    const newCategory = await Category.create({
      name,
      group: cleanText(req.body.group),
      brands: cleanBrands(req.body.brands),
    });

    res.status(201).json({
      success: true,
      data: newCategory,
      message: "Kategori başarıyla oluşturuldu.",
    });
  })
);

// Tüm Kategorileri Getirme
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const categories = await Category.find().sort({ name: 1 });
    res.status(200).json({
      success: true,
      data: categories,
      message: "Kategoriler başarıyla getirildi.",
    });
  })
);

// Belirli Bir Kategoriyi Getirme
router.get(
  "/:categoryId",
  asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.categoryId);
    if (!category) throw new HttpError(404, "Kategori bulunamadı.");
    res.status(200).json({
      success: true,
      data: category,
      message: "Kategori başarıyla getirildi.",
    });
  })
);

// Kategori Güncelleme
router.put(
  "/:categoryId",
  authMiddleware,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.categoryId);
    if (!category) throw new HttpError(404, "Kategori bulunamadı.");

    const name = cleanText(req.body.name);
    if (name) {
      await ensureUniqueName(name, category._id);
      category.name = name;
    }
    if (typeof req.body.group === "string")
      category.group = cleanText(req.body.group);
    if (Array.isArray(req.body.brands))
      category.brands = cleanBrands(req.body.brands);
    await category.save();

    res.status(200).json({
      success: true,
      data: category,
      message: "Kategori başarıyla güncellendi.",
    });
  })
);

// Kategori Silme
router.delete(
  "/:categoryId",
  authMiddleware,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { categoryId } = req.params;
    const productCount = await Product.countDocuments({ category: categoryId });
    if (productCount > 0) {
      throw new HttpError(
        400,
        `Bu kategoride ${productCount} ürün var. Önce ürünleri silin veya başka kategoriye taşıyın.`
      );
    }

    const deleted = await Category.findByIdAndDelete(categoryId);
    if (!deleted) throw new HttpError(404, "Kategori bulunamadı.");

    res.status(200).json({
      success: true,
      message: "Kategori başarıyla silindi.",
    });
  })
);

module.exports = router;
