/********************************************************
 * backend/routes/discount.js  (sadece admin)
 ********************************************************/
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/requireAdmin");
const Product = require("../models/Product");
const { HttpError, asyncHandler, exactMatch } = require("../utils/http");
const { imageUrl } = require("../utils/productSerializer");

router.use(authMiddleware, requireAdmin);

// Kategori + (opsiyonel) marka filtresi
const buildFilter = (categoryId, brandIds) => {
  if (!mongoose.isValidObjectId(categoryId)) {
    throw new HttpError(400, "Geçerli bir kategori seçin.");
  }
  const filter = { category: categoryId };
  if (
    Array.isArray(brandIds) &&
    brandIds.length > 0 &&
    !brandIds.includes("all")
  ) {
    filter.brand = { $in: brandIds.map((b) => exactMatch(String(b).trim())) };
  }
  return filter;
};

// 1) İndirimli ürünler listesi
// GET /api/discounts/products
router.get(
  "/products",
  asyncHandler(async (req, res) => {
    const prods = await Product.find({ "price.discount": { $gt: 0 } })
      .select("-img.data -img.contentType -reviews")
      .populate("category", "name")
      .sort({ updatedAt: -1 });

    const list = prods.map((p) => ({
      _id: p._id,
      name: p.name,
      img: p.img?.[0] ? imageUrl(p._id, p.img[0]._id) : null,
      price: p.price,
      category: p.category?.name || null,
      brand: p.brand,
    }));

    res.status(200).json({
      success: true,
      data: list,
      message: "İndirimli ürünler başarıyla getirildi.",
    });
  })
);

// 2) İndirim uygula
// POST /api/discounts/apply
router.post(
  "/apply",
  asyncHandler(async (req, res) => {
    const { categoryId, brandIds, discount, updateAll } = req.body;
    const discountNum = Number(discount);

    if (!Number.isFinite(discountNum) || discountNum < 0 || discountNum > 100) {
      throw new HttpError(400, "İndirim oranı 0 ile 100 arasında olmalıdır.");
    }

    const filter = buildFilter(categoryId, brandIds);
    if (!updateAll) {
      // Sadece henüz indirimi olmayan ürünler
      filter.$or = [
        { "price.discount": 0 },
        { "price.discount": { $exists: false } },
      ];
    }

    const result = await Product.updateMany(filter, {
      $set: { "price.discount": discountNum },
    });

    res.status(200).json({
      success: true,
      data: { modifiedCount: result.modifiedCount },
      message: `İndirim başarıyla uygulandı. Güncellenen ürün sayısı: ${result.modifiedCount}`,
    });
  })
);

// 3) Seçilen kategori ve markalarda indirimli ürün var mı kontrolü
// POST /api/discounts/check
router.post(
  "/check",
  asyncHandler(async (req, res) => {
    const { categoryId, brandIds } = req.body;
    const filter = buildFilter(categoryId, brandIds);
    filter["price.discount"] = { $gt: 0 };

    const count = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: { hasDiscountedProducts: count > 0, count },
      message: "İndirimli ürün kontrolü başarıyla yapıldı.",
    });
  })
);

// 4) Bir ürünün indirimini kaldır
// DELETE /api/discounts/:productId
router.delete(
  "/:productId",
  asyncHandler(async (req, res) => {
    const result = await Product.updateOne(
      { _id: req.params.productId },
      { $set: { "price.discount": 0 } }
    );
    if (result.matchedCount === 0) throw new HttpError(404, "Ürün bulunamadı.");

    res.status(200).json({
      success: true,
      message: "Üründen indirim başarıyla kaldırıldı.",
    });
  })
);

module.exports = router;
