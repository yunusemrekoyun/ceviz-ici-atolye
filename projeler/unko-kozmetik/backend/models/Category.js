/********************************************************
 * backend/models/Category.js
 ********************************************************/
const mongoose = require("mongoose");

const CategorySchema = mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Header'daki menüde kategorinin listeleneceği başlık (örn. "Saç Bakımı")
    group: { type: String, trim: true, default: "" },
    // Her kategori için markalar dizisi
    brands: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

const Category = mongoose.model("Category", CategorySchema);
module.exports = Category;
