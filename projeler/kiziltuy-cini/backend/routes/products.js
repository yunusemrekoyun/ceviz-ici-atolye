const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const multer = require("multer");
const { verifyToken, isAdmin } = require("../middleware/auth");
// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

/* ───────── SEARCH (önce gelmeli) ───────── */
router.get("/search/:keyword", async (req, res) => {
  try {
    const keyword = req.params.keyword;
    const regex = new RegExp(keyword, "i");
    const products = await Product.find({ name: { $regex: regex } })
      .select("-mainImages.data -childImages1.data -childImages2.data")
      .populate("category", "name")
      .lean();
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Arama hatası." });
  }
});

// ── READ ALL with pagination ─────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const query = {};
    if (req.query.category) query.category = req.query.category;
    if (req.query.subcategory) query.subcategory = req.query.subcategory;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 20, 1);
    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .select("-mainImages.data -childImages1.data -childImages2.data")
      .populate("category", "name")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      products,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ürünler alınamadı." });
  }
});
// ── READ ONE ────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  // ← sadece tek GET /:id kaldı
  try {
    const product = await Product.findById(req.params.id)
      .select("-mainImages.data -childImages1.data -childImages2.data")
      .populate("category", "name")
      .lean();
    if (!product) return res.status(404).json({ error: "Ürün bulunamadı." });

    const favoritedByCount = await mongoose.model("User").countDocuments({
      favorites: product._id,
    });

    res.json({ ...product, favoritedByCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});
// CREATE
router.post(
  "/",
  verifyToken,
  isAdmin,
  upload.fields([
    { name: "mainImages" },
    { name: "childImages1" },
    { name: "childImages2" },
  ]),
  async (req, res) => {
    try {
      const {
        name,
        category,
        subcategory,
        opt1,
        opt2,
        price,
        mainDescription,
        childDescription1,
        childDescription2,
        buyLink,
      } = req.body;

      const mapImages = (files) =>
        (files || []).map((file) => ({
          data: file.buffer,
          contentType: file.mimetype,
        }));

      const product = new Product({
        name,
        category,
        subcategory,
        opt1: JSON.parse(opt1 || "[]"),
        opt2: JSON.parse(opt2 || "[]"),
        price: JSON.parse(price || "{}"),
        mainDescription,
        childDescription1,
        childDescription2,
        buyLink: JSON.parse(buyLink || "[]"),
        mainImages: mapImages(req.files?.mainImages),
        childImages1: mapImages(req.files?.childImages1),
        childImages2: mapImages(req.files?.childImages2),
      });

      await product.save();
      res.status(201).json(product);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Ürün oluşturulamadı." });
    }
  }
);

// routes/products.js

// UPDATE
router.put(
  "/:id",
  verifyToken,
  isAdmin,
  upload.fields([
    { name: "mainImages" },
    { name: "childImages1" },
    { name: "childImages2" },
  ]),
  async (req, res) => {
    try {
      const {
        name,
        category,
        subcategory,
        opt1,
        opt2,
        price,
        mainDescription,
        childDescription1,
        childDescription2,
        buyLink,
      } = req.body;

      const updates = {
        name,
        category,
        subcategory,
        opt1: JSON.parse(opt1 || "[]"),
        opt2: JSON.parse(opt2 || "[]"),
        price: JSON.parse(price || "{}"),
        mainDescription,
        childDescription1,
        childDescription2,
        buyLink: JSON.parse(buyLink || "[]"),
      };

      const mapImages = (files) =>
        (files || []).map((file) => ({
          data: file.buffer,
          contentType: file.mimetype,
        }));

      if (req.files?.mainImages) {
        updates.mainImages = mapImages(req.files.mainImages);
      }
      if (req.files?.childImages1) {
        updates.childImages1 = mapImages(req.files.childImages1);
      }
      if (req.files?.childImages2) {
        updates.childImages2 = mapImages(req.files.childImages2);
      }

      const updated = await Product.findByIdAndUpdate(req.params.id, updates, {
        new: true,
      }).populate("category");

      if (!updated) return res.status(404).json({ error: "Ürün bulunamadı." });
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Güncelleme hatası." });
    }
  }
);

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Ürün bulunamadı." });
    res.json(deleted);
  } catch (err) {
    res.status(500).json({ error: "Silme hatası." });
  }
});

// GET IMAGE by type/index
router.get("/:id/image/:type/:index", async (req, res) => {
  try {
    const { id, type, index } = req.params;
    const product = await Product.findById(id).select(type);

    const imageList = product?.[type];
    const image = imageList?.[index];
    if (!image) return res.status(404).end();

    res.set("Content-Type", image.contentType);
    res.send(image.data);
  } catch (err) {
    res.status(500).json({ error: "Resim alınamadı." });
  }
});
// Tüm ürünlerin toplam favorilenme sayısı
router.get("/favorites/total-count", async (req, res) => {
  try {
    const count = await mongoose
      .model("User")
      .aggregate([
        { $unwind: "$favorites" },
        { $group: { _id: "$favorites" } },
        { $count: "total" },
      ]);

    res.json({ total: count[0]?.total || 0 });
  } catch (err) {
    console.error("Favori sayısı alınamadı:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
// routes/products.js içinde → GET /:id
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .select("-mainImages.data -childImages1.data -childImages2.data")
      .populate("category", "name")
      .lean();

    if (!product) return res.status(404).json({ error: "Ürün bulunamadı." });

    // ⭐ Favori sayısını getir
    const favoritedByCount = await mongoose.model("User").countDocuments({
      favorites: product._id,
    });

    res.json({ ...product, favoritedByCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});
module.exports = router;
