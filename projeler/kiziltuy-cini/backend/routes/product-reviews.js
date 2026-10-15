// 📁 routes/productReviews.js
const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

// ✅ Approve a review
// routes/productReviews.js içinde:
router.get("/approved", async (req, res) => {
  try {
    const products = await Product.find({ "reviews.isApproved": true })
      .select("name reviews")
      .populate("reviews.user", "username");

    const approvedReviews = [];

    products.forEach((product) => {
      product.reviews.forEach((review) => {
        if (review.isApproved && review.user) {
          approvedReviews.push({
            ...review.toObject(),
            productId: product._id, // 💥 Eksik olan burası
            product: { name: product.name },
          });
        }
      });
    });

    res.json(approvedReviews);
  } catch (error) {
    console.error("Approved reviews error:", error.message);
    res.status(500).json({ error: "Sunucu hatası (approved)." });
  }
});
// Get pending reviews
// product-reviews.js
router.get("/pending", async (req, res) => {
  try {
    const products = await Product.find()
      .select("name reviews")
      .populate("reviews.user", "username");

    const pendingReviews = [];

    products.forEach((product) => {
      product.reviews.forEach((review) => {
        if (review && review.isApproved === false && review.user) {
          pendingReviews.push({
            ...review.toObject(),
            productId: product._id,
            product: { name: product.name },
          });
        }
      });
    });

    res.json(pendingReviews);
  } catch (error) {
    console.error("Pending reviews error:", error.message);
    res.status(500).json({ error: "Sunucu hatası (pending)." });
  }
});
// ✅ Add a new review to a product
router.post("/:productId", async (req, res) => {
  try {
    const { text, rating, user } = req.body;
    if (!text || !rating || !user)
      return res.status(400).json({ error: "Eksik alanlar var." });

    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: "Ürün bulunamadı." });

    product.reviews.push({ text, rating, user });
    await product.save();

    const populated = await Product.findById(product._id).populate(
      "category reviews.user",
      "username avatar"
    );
    res.status(201).json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});
// ✅ PATCH: Onayla
router.patch("/:productId/:reviewId/approve", async (req, res) => {
  try {
    const { productId, reviewId } = req.params;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Ürün bulunamadı." });

    const review = product.reviews.id(reviewId);
    if (!review) return res.status(404).json({ error: "Yorum bulunamadı." });

    review.isApproved = true;
    await product.save();

    res.json({ success: true });
  } catch (error) {
    console.error("Yorum onaylama hatası:", error.message);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});
// ✅ Get reviews and review count of a product
router.get("/:productId", async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId)
      .select("reviews")
      .populate("reviews.user", "username avatar");

    if (!product) return res.status(404).json({ error: "Ürün bulunamadı." });

    res.json({
      reviews: product.reviews.filter((r) => r.isApproved),
      total: product.reviews.filter((r) => r.isApproved).length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});
// ✅ DELETE: Yorum sil
router.delete("/:productId/:reviewId", async (req, res) => {
  try {
    const { productId, reviewId } = req.params;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Ürün bulunamadı." });

    const review = product.reviews.id(reviewId);
    if (!review) return res.status(404).json({ error: "Yorum bulunamadı." });

    // 👇 Bu satırı değiştir
    product.reviews.pull(reviewId); // daha güvenli

    await product.save();

    res.json({ success: true });
  } catch (error) {
    console.error("Yorum silme hatası:", error.message);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});
module.exports = router;
