const mongoose = require("mongoose");

const DISCOUNT_TYPES = ["percent", "fixed"];

const CouponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },
    isEnabled: { type: Boolean, default: true },
    discountType: {
      type: String,
      enum: DISCOUNT_TYPES,
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0.01 },
    minimumSubtotal: { type: Number, default: 0, min: 0 },
    // Boşsa süresiz. Bu andan sonra kupon kabul edilmez.
    expiresAt: { type: Date, default: null },
    // Boşsa sınırsız. Ödenmiş ve ödeme bekleyen siparişler sayılır.
    maxUses: { type: Number, default: null, min: 1 },
    productIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    ],
  },
  { timestamps: true }
);

CouponSchema.pre("validate", function (next) {
  if (!Array.isArray(this.productIds) || this.productIds.length === 0) {
    return next(new Error("Kupon için en az bir ürün seçilmelidir."));
  }

  const code = String(this.code || "").trim().toUpperCase();
  if (!code) {
    return next(new Error("Kupon kodu zorunludur."));
  }

  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
    return next(
      new Error(
        "Kupon kodu 3-40 karakter aralığında olmalı ve yalnızca harf, rakam, tire veya alt çizgi içermelidir."
      )
    );
  }

  if (this.discountType === "percent" && Number(this.discountValue) > 100) {
    return next(new Error("Yüzdelik kuponlar 100'ü aşamaz."));
  }

  next();
});

CouponSchema.index({ isEnabled: 1, createdAt: -1 });

module.exports = mongoose.model("Coupon", CouponSchema);
module.exports.DISCOUNT_TYPES = DISCOUNT_TYPES;
