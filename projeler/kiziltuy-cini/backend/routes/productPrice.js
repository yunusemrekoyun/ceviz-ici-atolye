const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const PriceCache = require("../models/PriceCache");
const fetchPrice = require("./fetchPrice");

const DAY_MS = 86_400_000; // 24 saat

/* -------- /:id/update -------------------------------------------- */
router.post("/:id/update", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Ürün yok." });

    let url = (product.buyLink || []).find((l) =>
      /trendyol\.com/.test(l || "")
    );
    if (!url) return res.status(400).json({ error: "Trendyol linki yok." });
    if (!/^https?:\/\//.test(url)) url = "https://" + url.replace(/^\/\//, "");

    let cache = await PriceCache.findOne({ product: product._id });
    if (cache && Date.now() - cache.lastFetched < DAY_MS) {
      const hrs = Math.ceil(
        (DAY_MS - (Date.now() - cache.lastFetched)) / 3.6e6
      );
      return res
        .status(429)
        .json({ error: `${hrs} saat sonra tekrar çekilebilir.` });
    }

    const price = await fetchPrice(url);
    if (!price) throw new Error("Fiyat alınamadı");

    product.price.current = price;
    await product.save();

    if (!cache) cache = new PriceCache({ product: product._id });
    cache.lastFetched = new Date();
    await cache.save();

    res.json({ ok: true, current: price });
  } catch (err) {
    console.error("Fiyat güncelleme hatası:", err);
    res.status(500).json({ error: err.message || "Sunucu hatası" });
  }
});

/* -------- /fetch (URL’den anlık) --------------------------------- */
router.post("/fetch", async (req, res) => {
  try {
    let { url } = req.body;
    if (!url || !/trendyol\.com/.test(url))
      return res.status(400).json({ error: "Geçerli Trendyol URL gerekli." });
    if (!/^https?:\/\//.test(url)) url = "https://" + url.replace(/^\/\//, "");

    const price = await fetchPrice(url);
    if (!price) throw new Error("Fiyat bulunamadı");

    res.json({ price });
  } catch (err) {
    console.error("Fiyat çekme (URL) hatası:", err);
    res.status(500).json({ error: err.message || "Sunucu hatası" });
  }
});

module.exports = router;
