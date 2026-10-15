const mongoose = require("mongoose");

const ReviewSchema = mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    approved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const ProductSchema = mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    img: [{ data: Buffer, contentType: String }],
    reviews: [ReviewSchema],
    colors: [{ type: String }],
    sizes: [{ type: String }],
    price: {
      current: { type: Number, required: true, min: 0 },
      discount: { type: Number, default: 0, min: 0, max: 100 },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    brand: { type: String, lowercase: true, trim: true },
    description: { type: String },
    // Sadece onaylı yorumlardan hesaplanır
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ProductSchema.pre("save", function (next) {
  const approved = (this.reviews || []).filter((r) => r.approved);
  this.reviewCount = approved.length;
  this.averageRating = approved.length
    ? approved.reduce((sum, r) => sum + r.rating, 0) / approved.length
    : 0;
  next();
});

module.exports = mongoose.model("Product", ProductSchema);
