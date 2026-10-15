const express = require("express");
const router = express.Router();
const VisitStats = require("../models/VisitStats");

router.post("/", async (req, res) => {
  try {
    const { type, targetId, duration } = req.body;

    if (!["product", "blog"].includes(type) || !targetId)
      return res.status(400).json({ error: "Invalid payload" });

    const today = new Date().toISOString().split("T")[0];

    const stat = await VisitStats.findOneAndUpdate(
      { type, targetId, date: today },
      {
        $inc: {
          visitCount: 1,
          totalDuration: duration || 0,
        },
      },
      { upsert: true, new: true }
    );

    // 🟢 Konsola log bas
    console.log(
      `🟢 [VISIT] ${type.toUpperCase()} ${targetId} → ${today} tarihinde +1 ziyaret (${
        duration || 0
      } ms eklendi)`
    );

    res.status(200).json({ success: true, stat });
  } catch (err) {
    console.error("❌ Ziyaret istatistik hatası:", err);
    res.status(500).json({ error: "Server error" });
  }
});
// routes/visits.js
router.get("/total-duration", async (req, res) => {
  const { type } = req.query;

  if (!["product", "blog"].includes(type)) {
    return res.status(400).json({ error: "type parametresi geçersiz" });
  }

  try {
    const results = await VisitStats.aggregate([
      { $match: { type } },
      {
        $group: {
          _id: "$targetId",
          totalDuration: { $sum: "$totalDuration" },
        },
      },
      {
        $lookup: {
          from: type === "product" ? "products" : "blogs",
          localField: "_id",
          foreignField: "_id",
          as: "item",
        },
      },
      { $unwind: "$item" },
      {
        $project: {
          name: {
            $cond: [{ $eq: [type, "product"] }, "$item.name", "$item.title"],
          },
          totalDuration: 1,
        },
      },
      { $sort: { totalDuration: -1 } },
    ]);

    res.json(results);
  } catch (err) {
    console.error("❌ total-duration hatası:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
// routes/visits.js
router.get("/monthly-unique-products", async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const result = await VisitStats.aggregate([
      {
        $match: {
          type: "product",
          date: { $regex: `^${currentMonth}` }, // örn: 2025-06
        },
      },
      {
        $group: {
          _id: "$targetId",
        },
      },
      {
        $count: "total",
      },
    ]);

    res.json({ total: result[0]?.total || 0 });
  } catch (err) {
    console.error("Aylık ürün ziyareti hatası:", err.message);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
module.exports = router;
