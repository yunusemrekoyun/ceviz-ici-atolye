const mongoose = require("mongoose");

const ShippingMethodSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    fee: { type: Number, required: true, min: 0 },
    // ₺X ve üzeri ücretsiz. null/undefined → “eşik yok, hep ücretli”
    freeShippingThreshold: { type: Number, default: null, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShippingMethod", ShippingMethodSchema);
