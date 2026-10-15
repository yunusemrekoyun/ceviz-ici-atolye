///Applications/Works/oldsocks main/oldsocks/backend/models/Blog.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const BlogCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, unique: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BlogCategory", BlogCategorySchema);
