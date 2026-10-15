const mongoose = require("mongoose");

const TEMPLATE_TYPES = [
  "buy_x_get_y_free",
  "buy_x_get_percent",
  "spend_x_get_percent",
];

const HEADER_PLACEMENTS = ["none", "top_panel", "sub_panel"];

const CartCampaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    templateType: {
      type: String,
      enum: TEMPLATE_TYPES,
      required: true,
    },
    isEnabled: { type: Boolean, default: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    headerPlacement: {
      type: String,
      enum: HEADER_PLACEMENTS,
      default: "none",
    },
    productIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    ],
    // Sadece yüzde bazlı kampanyalarda anlamlıdır.
    stackWithCatalogDiscount: { type: Boolean, default: true },
    rules: {
      xQty: { type: Number, min: 1, default: null },
      yQty: { type: Number, min: 1, default: null },
      discountPercent: { type: Number, min: 0, max: 100, default: null },
      thresholdAmount: { type: Number, min: 0, default: null },
    },
  },
  { timestamps: true }
);

CartCampaignSchema.pre("validate", function (next) {
  if (!Array.isArray(this.productIds) || this.productIds.length === 0) {
    return next(new Error("Kampanya için en az bir ürün seçilmelidir."));
  }
  if (!(this.startAt instanceof Date) || Number.isNaN(this.startAt.getTime())) {
    return next(new Error("Geçerli bir başlangıç tarihi zorunludur."));
  }
  if (!(this.endAt instanceof Date) || Number.isNaN(this.endAt.getTime())) {
    return next(new Error("Geçerli bir bitiş tarihi zorunludur."));
  }
  if (this.endAt <= this.startAt) {
    return next(new Error("Bitiş tarihi başlangıç tarihinden sonra olmalıdır."));
  }

  const xQty = Number(this.rules?.xQty);
  const yQty = Number(this.rules?.yQty);
  const discountPercent = Number(this.rules?.discountPercent);
  const thresholdAmount = Number(this.rules?.thresholdAmount);

  if (this.templateType === "buy_x_get_y_free") {
    if (!Number.isFinite(xQty) || xQty < 1) {
      return next(new Error("xQty zorunludur ve 1'den küçük olamaz."));
    }
    if (!Number.isFinite(yQty) || yQty < 1) {
      return next(new Error("yQty zorunludur ve 1'den küçük olamaz."));
    }
  }

  if (this.templateType === "buy_x_get_percent") {
    if (!Number.isFinite(xQty) || xQty < 1) {
      return next(new Error("xQty zorunludur ve 1'den küçük olamaz."));
    }
    if (!Number.isFinite(discountPercent) || discountPercent <= 0) {
      return next(
        new Error("discountPercent zorunludur ve 0'dan büyük olmalıdır.")
      );
    }
  }

  if (this.templateType === "spend_x_get_percent") {
    if (!Number.isFinite(thresholdAmount) || thresholdAmount <= 0) {
      return next(
        new Error("thresholdAmount zorunludur ve 0'dan büyük olmalıdır.")
      );
    }
    if (!Number.isFinite(discountPercent) || discountPercent <= 0) {
      return next(
        new Error("discountPercent zorunludur ve 0'dan büyük olmalıdır.")
      );
    }
  }

  next();
});

CartCampaignSchema.index({ isEnabled: 1, startAt: 1, endAt: 1, createdAt: 1 });
CartCampaignSchema.index({ headerPlacement: 1, isEnabled: 1, startAt: 1, endAt: 1 });

module.exports = mongoose.model("CartCampaign", CartCampaignSchema);
module.exports.TEMPLATE_TYPES = TEMPLATE_TYPES;
module.exports.HEADER_PLACEMENTS = HEADER_PLACEMENTS;
