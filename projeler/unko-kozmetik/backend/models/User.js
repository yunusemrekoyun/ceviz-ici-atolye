/********************************************************
 * backend/models/User.js
 ********************************************************/
const mongoose = require("mongoose");

const UserSchema = mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: { type: String, default: "user", enum: ["user", "admin"] },
  },
  { timestamps: true }
);

const User = mongoose.model("User", UserSchema);
module.exports = User;
