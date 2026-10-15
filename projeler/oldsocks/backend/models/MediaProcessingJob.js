const mongoose = require("mongoose");

const JOB_STATUSES = Object.freeze([
  "queued",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

const MediaProcessingJobSchema = new mongoose.Schema(
  {
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MediaAsset",
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: JOB_STATUSES,
      default: "queued",
      required: true,
      index: true,
    },
    priority: { type: Number, default: 100, index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    nextAttemptAt: { type: Date, default: Date.now, index: true },
    lockedAt: { type: Date, default: null },
    workerId: { type: String, default: "" },
    completedAt: { type: Date, default: null },
    errorCode: { type: String, default: "" },
    errorMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

MediaProcessingJobSchema.index({ status: 1, priority: 1, nextAttemptAt: 1 });

const MediaProcessingJob = mongoose.model(
  "MediaProcessingJob",
  MediaProcessingJobSchema
);

module.exports = MediaProcessingJob;
module.exports.JOB_STATUSES = JOB_STATUSES;
