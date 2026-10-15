// /Applications/Works/Mustafa Çini MERN site/backend/models/PriceCache.js
const mongoose = require("mongoose");

const PriceCacheSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    unique: true, // her ürün için tek kayıt
    required: true,
  },
  lastFetched: { type: Date }, // en son başarılı fiyat çekimi
});

module.exports = mongoose.model("PriceCache", PriceCacheSchema);
