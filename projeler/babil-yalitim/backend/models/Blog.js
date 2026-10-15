const mongoose = require("mongoose");
const mediaSchema = require("./schemas/mediaSchema");

const blogTranslationSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    content: { type: String, default: "" },
    tags: { type: [String], default: [] },
  },
  { _id: false }
);

const commentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, select: false },
    emailHash: { type: String, default: "" },
    emailMasked: { type: String, trim: true, default: "" },
    body: { type: String, required: true, trim: true },
    approved: { type: Boolean, default: false },
  },
  { timestamps: true, _id: true }
);

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    displayOrder: { type: Number, default: 1, min: 1 },
    content: { type: String, required: true }, // zengin metin/plain
    tags: { type: [String], default: [] }, // opsiyonel
    cover: { type: mediaSchema, required: true }, // zorunlu kapak (image)
    assets: { type: [mediaSchema], default: [] }, // opsiyonel: image/video (çoklu)
    translations: {
      en: { type: blogTranslationSchema, default: () => ({}) },
    },
    comments: { type: [commentSchema], default: [] }, // gömülü yorumlar
  },
  { timestamps: true }
);

module.exports = mongoose.models.Blog || mongoose.model("Blog", blogSchema);
