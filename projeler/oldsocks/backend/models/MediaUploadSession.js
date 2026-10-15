const mongoose = require("mongoose");
const { MEDIA_KINDS, PURPOSE_POLICIES } = require("../config/media");

const UPLOAD_STATUSES = Object.freeze([
  "reserved",
  "uploading",
  "completed",
  "cancelled",
  "expired",
  "failed",
]);

const MediaUploadSessionSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: true,
      unique: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    clientUploadId: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    purpose: {
      type: String,
      enum: Object.keys(PURPOSE_POLICIES),
      required: true,
    },
    kind: {
      type: String,
      enum: Object.values(MEDIA_KINDS),
      required: true,
    },
    originalName: { type: String, required: true },
    declaredMime: { type: String, default: "" },
    expectedBytes: { type: Number, required: true, min: 1 },
    receivedBytes: { type: Number, default: 0, min: 0 },
    reservationBytes: { type: Number, required: true, min: 1 },
    chunkBytes: { type: Number, required: true, min: 1 },
    stagingKey: { type: String, required: true },
    status: {
      type: String,
      enum: UPLOAD_STATUSES,
      default: "reserved",
      required: true,
      index: true,
    },
    chunkLocked: { type: Boolean, default: false },
    lastActivityAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true, index: true },
    failureCode: { type: String, default: "" },
    failureMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

MediaUploadSessionSchema.index({ createdBy: 1, status: 1, createdAt: -1 });
MediaUploadSessionSchema.index({ status: 1, expiresAt: 1 });
MediaUploadSessionSchema.index(
  { createdBy: 1, clientUploadId: 1 },
  {
    unique: true,
    partialFilterExpression: { clientUploadId: { $type: "string", $gt: "" } },
  }
);

const MediaUploadSession = mongoose.model(
  "MediaUploadSession",
  MediaUploadSessionSchema
);

module.exports = MediaUploadSession;
module.exports.UPLOAD_STATUSES = UPLOAD_STATUSES;
