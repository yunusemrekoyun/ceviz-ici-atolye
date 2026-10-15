const mongoose = require("mongoose");

const BackupJobSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["backup", "preview", "restore"], required: true },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      default: "queued",
      index: true,
    },
    snapshotId: { type: String, default: "" },
    previewId: { type: mongoose.Schema.Types.ObjectId, ref: "BackupJob", default: null },
    expectedFingerprint: { type: String, default: "" },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    lockedAt: { type: Date, default: null },
    workerId: { type: String, default: "" },
    errorCode: { type: String, default: "" },
    detail: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

BackupJobSchema.index({ status: 1, createdAt: 1 });
module.exports = mongoose.model("BackupJob", BackupJobSchema);
