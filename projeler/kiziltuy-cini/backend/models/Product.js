const mongoose = require("mongoose");

const ReviewSchema = mongoose.Schema(
  {
    text: { type: String, required: true },
    rating: { type: Number, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isApproved: { type: Boolean, default: false }, // ✅ EKLENECEK
  },
  { timestamps: true }
);

const ImageSchema = mongoose.Schema({
  data: Buffer,
  contentType: String,
});

const ProductSchema = mongoose.Schema(
  {
    name: { type: String, required: true },

    // Görseller
    mainImages: [ImageSchema],
    childImages1: [ImageSchema],
    childImages2: [ImageSchema],

    // Yorumlar
    reviews: [ReviewSchema],

    // Opsiyonlar
    opt1: [{ type: String }],
    opt2: [{ type: String }],

    // Fiyat
    price: {
      current: { type: Number },
      discount: { type: Number },
    },

    // Kategori bilgisi
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subcategory: {
      type: String,
    },

    // 🔄 Çoklu satın alma linki
    buyLink: {
      type: [String],
      default: [],
    },

    // Açıklamalar
    mainDescription: { type: String },
    childDescription1: { type: String },
    childDescription2: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
