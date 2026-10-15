const express = require("express");
const router = express.Router();
const Campaign = require("../models/Campaign");
const Product = require("../models/Product");
const multer = require("multer");

const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Kampanya arka plan görselini ayrı endpoint ile döndür
router.get("/:id/image", async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign || !campaign.background?.data) {
      return res.status(404).end();
    }

    res.set("Content-Type", campaign.background.contentType);
    res.send(campaign.background.data);
  } catch (err) {
    res.status(500).json({ error: "Görsel yüklenemedi" });
  }
});

// ✅ CREATE
router.post("/", upload.single("background"), async (req, res) => {
  try {
    const { title, description, products } = req.body;
    const campaign = new Campaign({
      title,
      description,
      products: JSON.parse(products),
    });

    if (req.file) {
      campaign.background = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    await campaign.save();
    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ READ tüm kampanyalar
// READ tüm kampanyalar (images hariç, pagination)
router.get("/", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);

    const total = await Campaign.countDocuments();
    const campaigns = await Campaign.find()
      // background.data Buffer’ını hariç tut
      .select("-background.data")
      .populate("products", "name") // yalnızca isim getir, gerekirse alan ekle
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      campaigns,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Kampanyalar alınamadı." });
  }
});

// READ tek kampanya (background.data hariç)
router.get("/:id", async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .select("-background.data")
      .populate("products", "name");
    if (!campaign) {
      return res.status(404).json({ error: "Kampanya bulunamadı." });
    }
    res.json(campaign);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// ✅ UPDATE
router.put("/:id", upload.single("background"), async (req, res) => {
  try {
    const { title, description, products } = req.body;
    const updateData = {
      title,
      description,
      products: JSON.parse(products),
    };

    if (req.file) {
      updateData.background = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    const updated = await Campaign.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ DELETE
router.delete("/:id", async (req, res) => {
  try {
    await Campaign.findByIdAndDelete(req.params.id);
    res.json({ message: "Kampanya silindi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
