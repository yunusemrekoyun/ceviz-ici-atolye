// backend/models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },

    role: { type: String, default: "user", enum: ["user", "admin"] },

    /* Şifre sıfırlama */
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },

    /* Avatar (buffer) */
    avatar: {
      data: Buffer,
      contentType: String,
    },

    /* İlişkiler */
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    likedBlogs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Blog" }],

    /* E-posta doğrulama */
    emailVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationTokenExpires: { type: Date }, // ✅ EKLENDİ
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
