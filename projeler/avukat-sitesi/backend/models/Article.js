// models/Article.js
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

const ArticleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    summary: { type: String },
    content: { type: String }, // HTML/Markdown
    image: { type: ImageSchema, default: null },
    imageAlt: { type: String },
    tags: [{ type: String }],
    publishedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "published",
    },
  },
  { timestamps: true }
);

export const Article = mongoose.model("Article", ArticleSchema);
