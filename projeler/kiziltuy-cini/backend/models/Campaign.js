const mongoose = require("mongoose");

const CampaignSchema = mongoose.Schema(
  {
    title: { type: String, required: true },
    background: {
      data: Buffer,
      contentType: String,
    },
    description: { type: String, required: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Campaign", CampaignSchema);
