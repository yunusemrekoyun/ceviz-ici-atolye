const mongoose = require("mongoose");

const CouponSchema = mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discountPercent: { type: Number, required: true, min: 1, max: 100 }, //indirim oranı
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", CouponSchema);
module.exports = Coupon;
