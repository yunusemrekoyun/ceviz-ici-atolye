///Applications/Works/oldsocks main/oldsocks/backend/models/Category.js
const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: "",
    },
    imageAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MediaAsset",
      default: null,
      index: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    archivedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
  }
);

// “children” sanal alanı: parent’ı bu kategoriye işaret edenleri getirir
CategorySchema.virtual("children", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent",
  justOne: false,
});

module.exports = mongoose.model("Category", CategorySchema);
