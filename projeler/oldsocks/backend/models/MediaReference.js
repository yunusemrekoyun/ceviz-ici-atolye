const mongoose = require("mongoose");

const OWNER_TYPES = Object.freeze([
  "Product",
  "Category",
  "Campaign",
  "MiniCampaign",
  "Blog",
  "HeroVideo",
  "User",
  "SiteContent",
]);

const MediaReferenceSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: true,
      index: true,
    },
    ownerType: { type: String, enum: OWNER_TYPES, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    field: { type: String, required: true, trim: true },
    position: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

MediaReferenceSchema.index(
  { ownerType: 1, ownerId: 1, field: 1, position: 1 },
  { unique: true }
);
MediaReferenceSchema.index({ ownerType: 1, ownerId: 1 });

const MediaReference = mongoose.model("MediaReference", MediaReferenceSchema);

module.exports = MediaReference;
module.exports.OWNER_TYPES = OWNER_TYPES;
