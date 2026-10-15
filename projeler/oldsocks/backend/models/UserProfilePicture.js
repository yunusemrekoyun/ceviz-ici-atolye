// backend/models/UserProfilePicture.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserProfilePictureSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    url: {
      type: String,
      default: "",
    },
    publicId: {
      type: String,
      default: "",
    },
    mediaAsset: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserProfilePicture", UserProfilePictureSchema);
