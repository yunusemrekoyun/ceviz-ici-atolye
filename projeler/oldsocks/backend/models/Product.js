const mongoose = require("mongoose");

const SizeSchema = new mongoose.Schema({
  /** Beden opsiyonel; boş string = “bedensiz” */
  size: { type: String, default: "", trim: true, maxlength: 40 },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    validate: {
      validator: Number.isSafeInteger,
      message: "Stok tam sayı olmalıdır.",
    },
  },
});

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    video: { type: String, default: "" },
    images: [{ type: String }],
    videoAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MediaAsset",
      default: null,
      index: true,
    },
    imageAssets: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "MediaAsset" }],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length <= 6,
        message: "Bir üründe en fazla 6 görsel olabilir.",
      },
    },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    /** 🔑 Renk artık opsiyonel */
    color: { type: String, default: "", trim: true, maxlength: 80 },
    sizes: [SizeSchema], // bedenler (boş da olabilir)
    description: { type: String, default: "" },
    /** Varyant ilişkisi */
    parentProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
      index: true,
    },
    archivedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
