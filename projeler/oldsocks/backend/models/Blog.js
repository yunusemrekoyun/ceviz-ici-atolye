///Applications/Works/oldsocks main/oldsocks/backend/models/Blog.js
const mongoose = require("mongoose");
const { slugify } = require("../utils/slugify");
const { Schema } = mongoose;

const BlogSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    excerpt: { type: String, trim: true },
    content: { type: String, required: true }, // Markdown veya HTML
    coverImageUrl: { type: String, default: "" },
    coverImageAsset: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      default: null,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    categories: [
      {
        type: Schema.Types.ObjectId,
        ref: "BlogCategory",
      },
    ],
    tags: [{ type: String, trim: true }],
    comments: [
      {
        type: Schema.Types.ObjectId,
        ref: "BlogComment",
      },
    ],
    slug: { type: String, required: true, trim: true, unique: true },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

// İsteğe bağlı: otomatik slug üretme
BlogSchema.pre("validate", function (next) {
  if (this.isModified("title") && this.title) {
    this.slug = slugify(this.title);
  }
  next();
});

module.exports = mongoose.model("Blog", BlogSchema);
