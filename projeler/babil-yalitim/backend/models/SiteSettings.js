const mongoose = require("mongoose");

const siteSettingsSchema = new mongoose.Schema(
  {
    singleton: {
      type: String,
      default: "site",
      unique: true,
      immutable: true,
      trim: true,
    },
    homeProjectsVisible: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SiteSettings", siteSettingsSchema);
