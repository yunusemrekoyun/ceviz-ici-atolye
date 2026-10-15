import mongoose from "mongoose";

const { Schema } = mongoose;

const RefreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
    replacedByTokenHash: { type: String, default: null },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
  },
  { timestamps: true }
);

const RefreshToken =
  mongoose.models.RefreshToken || mongoose.model("RefreshToken", RefreshTokenSchema);

export default RefreshToken;
