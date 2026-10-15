const mongoose = require("mongoose");
const { MEDIA_KINDS, PURPOSE_POLICIES } = require("../config/media");

const ASSET_STATUSES = Object.freeze([
  "reserved",
  "uploading",
  "uploaded",
  "processing",
  "ready",
  "failed",
  "deleting",
  "trashed",
  "deleted",
  "missing",
  "quarantined",
]);

const BACKUP_STATUSES = Object.freeze([
  "not_configured",
  "pending",
  "protected",
  "failed",
]);

const VariantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: [MEDIA_KINDS.IMAGE, MEDIA_KINDS.VIDEO],
      required: true,
    },
    format: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    mime: { type: String, required: true, trim: true },
    bytes: { type: Number, required: true, min: 0 },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    durationSeconds: { type: Number, default: null },
    bitrate: { type: Number, default: null },
  },
  { _id: false }
);

const MediaAssetSchema = new mongoose.Schema(
  {
    purpose: {
      type: String,
      enum: Object.keys(PURPOSE_POLICIES),
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: Object.values(MEDIA_KINDS),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ASSET_STATUSES,
      default: "reserved",
      required: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    original: {
      fileName: { type: String, required: true },
      declaredMime: { type: String, default: "" },
      detectedMime: { type: String, default: "" },
      detectedExtension: { type: String, default: "" },
      bytes: { type: Number, required: true, min: 0 },
      checksumSha256: { type: String, default: "", index: true },
      stagingKey: { type: String, default: "" },
    },
    metadata: {
      width: { type: Number, default: null },
      height: { type: Number, default: null },
      durationSeconds: { type: Number, default: null },
      codec: { type: String, default: "" },
      colorSpace: { type: String, default: "" },
      hdr: { type: Boolean, default: false },
      hasAudio: { type: Boolean, default: false },
    },
    variants: { type: [VariantSchema], default: [] },
    primaryVariant: { type: String, default: "" },
    manifestKey: { type: String, default: "" },
    referenceCount: { type: Number, default: 0, min: 0 },
    trashKey: { type: String, default: "" },
    statusBeforeTrash: { type: String, default: "" },
    processing: {
      attempts: { type: Number, default: 0 },
      startedAt: { type: Date, default: null },
      completedAt: { type: Date, default: null },
      errorCode: { type: String, default: "" },
      errorMessage: { type: String, default: "" },
    },
    backup: {
      status: {
        type: String,
        enum: BACKUP_STATUSES,
        default: "not_configured",
      },
      protectedAt: { type: Date, default: null },
      checksumSha256: { type: String, default: "" },
      lastError: { type: String, default: "" },
    },
    trashedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false }
);

MediaAssetSchema.index({ createdBy: 1, createdAt: -1 });
MediaAssetSchema.index({ status: 1, "backup.status": 1, createdAt: 1 });
MediaAssetSchema.index(
  { "original.checksumSha256": 1, purpose: 1 },
  {
    partialFilterExpression: {
      "original.checksumSha256": { $type: "string", $gt: "" },
    },
  }
);

const MediaAsset = mongoose.model("MediaAsset", MediaAssetSchema);

module.exports = MediaAsset;
module.exports.ASSET_STATUSES = ASSET_STATUSES;
module.exports.BACKUP_STATUSES = BACKUP_STATUSES;
