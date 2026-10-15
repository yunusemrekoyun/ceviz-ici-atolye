const mongoose = require("mongoose");
const sectionKeys = ["new", "featured", "popular"];

const sectionSchema = new mongoose.Schema({
  heading: { type: String, trim: true, maxlength: 80, required: true },
  source: {
    type: String,
    enum: ["latest", "best_selling", "category", "manual", "random"],
    required: true,
  },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
  productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  shuffle: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
}, { _id: false });

const storefrontSettingsSchema = new mongoose.Schema({
  key: { type: String, default: "main", unique: true, immutable: true },
  fontPreset: { type: String, enum: ["classic", "modern", "fashion"], default: "classic" },
  heroButtonOpacity: { type: Number, min: 0, max: 100, default: 30, validate: Number.isInteger },
  sectionOrder: {
    type: [String],
    default: () => [...sectionKeys],
    validate: {
      validator: (order) => Array.isArray(order)
        && order.length === sectionKeys.length
        && sectionKeys.every((key) => order.includes(key))
        && new Set(order).size === sectionKeys.length,
      message: "Ürün alanlarının sırası geçersiz.",
    },
  },
  sections: {
    new: { type: sectionSchema, required: true },
    featured: { type: sectionSchema, required: true },
    popular: { type: sectionSchema, required: true },
  },
  cartRecommendations: {
    visible: { type: Boolean, default: true },
    heading: { type: String, trim: true, maxlength: 80, default: "Sepetinize yakışabilecek ürünler" },
    productIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length <= 12,
        message: "Sepet önerilerinde en fazla 12 ürün seçilebilir.",
      },
    },
  },
  similarProductsVisible: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("StorefrontSettings", storefrontSettingsSchema);
