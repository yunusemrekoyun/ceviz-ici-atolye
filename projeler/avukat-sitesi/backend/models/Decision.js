// models/Decision.js
import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema(
  {
    url: String,
    publicId: { type: String, index: true },
    width: Number,
    height: Number,
    format: String,
  },
  { _id: false }
);

const DecisionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true }, // Başlık
    slug: { type: String, required: true, unique: true, index: true },

    caseNo: { type: String }, // Esas No
    decisionNo: { type: String }, // Karar No
    date: { type: Date }, // Tarih
    chamber: { type: String }, // Daire

    summary: { type: String }, // Özet
    content: { type: String }, // HTML/Markdown

    image: { type: ImageSchema, default: null },
    imageAlt: { type: String },

    keywords: [{ type: String }], // arama için
    tags: [{ type: String }], // filtreleme için

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
  },
  { timestamps: true }
);

export const Decision = mongoose.model("Decision", DecisionSchema);
