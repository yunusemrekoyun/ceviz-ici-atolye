// backend/models/InstagramPost.js
const mongoose = require("mongoose");

const InstagramPostSchema = new mongoose.Schema(
  {
    embedLink: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    caption: {
      type: String,
      default: "",
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InstagramPost", InstagramPostSchema);
