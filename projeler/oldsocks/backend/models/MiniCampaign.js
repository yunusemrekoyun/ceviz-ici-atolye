///Applications/Works/oldsocks main/oldsocks/backend/models/MiniCampaign.js
const mongoose = require("mongoose");

const MiniCampaignSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "" },
    imageAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MediaAsset",
      default: null,
      index: true,
    },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    slot: {
      type: Number,
      enum: [1, 2],
      default: null,
    },
  },
  { timestamps: true }
);

// isActiveSlot1 / isActiveSlot2 sanal alanları da ekleyebilirsiniz:
MiniCampaignSchema.virtual("isActiveSlot1").get(function () {
  return this.slot === 1;
});
MiniCampaignSchema.virtual("isActiveSlot2").get(function () {
  return this.slot === 2;
});

MiniCampaignSchema.index(
  { slot: 1 },
  { unique: true, partialFilterExpression: { slot: { $type: "number" } } }
);

module.exports = mongoose.model("MiniCampaign", MiniCampaignSchema);
