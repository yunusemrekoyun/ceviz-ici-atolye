const mongoose = require("mongoose");

const mediaVariantSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    url: { type: String, required: true },
    storageKey: { type: String, required: true },
    format: String,
    width: Number,
    height: Number,
    bytes: Number,
  },
  { _id: false }
);

// Yüklenen ham dosya. Hiçbir zaman servis edilmez; yalnızca arşiv amaçlı
// saklanır ve admin panelindeki depolama yönetiminden silinebilir.
// Yalnızca web sürümü üretmek için gerçekten yeniden kodlama yapıldığında oluşur.
const mediaOriginalSchema = new mongoose.Schema(
  {
    storageKey: { type: String, required: true },
    format: String,
    width: Number,
    height: Number,
    bytes: Number,
    duration: Number,
  },
  { _id: false }
);

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    storageKey: { type: String, required: true },
    original: { type: mediaOriginalSchema, default: undefined },
    posterUrl: { type: String, default: "" },
    resourceType: { type: String, enum: ["image", "video"], required: true },
    format: String,
    width: Number,
    height: Number,
    bytes: Number,
    duration: Number,
    variants: { type: [mediaVariantSchema], default: [] },
  },
  { _id: false }
);

module.exports = mediaSchema;
