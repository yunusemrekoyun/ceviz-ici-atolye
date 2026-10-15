// backend/models/User.js
const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    street: { type: String, required: true, trim: true, maxlength: 180 },
    mainaddress: { type: String, required: true, trim: true, maxlength: 500 },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    district: { type: String, trim: true, maxlength: 120 },
    postalCode: { type: String, trim: true, maxlength: 20 },
  },
  { _id: true }
);

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 100,
    },
    password: { type: String, required: true },
    phone: { type: String, trim: true, maxlength: 16 },
    addresses: {
      type: [AddressSchema],
      default: [],
      validate: {
        validator: (addresses) => Array.isArray(addresses) && addresses.length <= 20,
        message: "Bir hesapta en fazla 20 adres saklanabilir.",
      },
    },
    avatar: { type: String },
    avatarAsset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MediaAsset",
      default: null,
    },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    refreshTokens: {
      type: [{ type: String, maxlength: 2048 }],
      default: [],
      select: false,
    },
    tokenVersion: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
