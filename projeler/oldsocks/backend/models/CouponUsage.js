const mongoose = require("mongoose");

const CouponUsageSchema = new mongoose.Schema(
  {
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    emailKey: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    orderConversationId: {
      type: String,
      trim: true,
      default: null,
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

CouponUsageSchema.index(
  { couponId: 1, user: 1 },
  {
    unique: true,
    partialFilterExpression: { user: { $type: "objectId" } },
  }
);

CouponUsageSchema.index(
  { couponId: 1, emailKey: 1 },
  {
    unique: true,
    partialFilterExpression: { emailKey: { $type: "string", $gt: "" } },
  }
);

CouponUsageSchema.index({ orderId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("CouponUsage", CouponUsageSchema);
