const mongoose = require("mongoose");

const HeroVideoSchema = new mongoose.Schema(
  {
    url: { type: String, default: "" },
    mediaAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MediaAsset",
      default: null,
      index: true,
    },
    // vitrinde gösterim sırası; küçük değer önce gelir
    order: { type: Number, default: 0, index: true },
    // yeni: medya türü (geri uyum için varsayılan 'video')
    kind: {
      type: String,
      enum: ["video", "image"],
      default: "video",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HeroVideo", HeroVideoSchema);
