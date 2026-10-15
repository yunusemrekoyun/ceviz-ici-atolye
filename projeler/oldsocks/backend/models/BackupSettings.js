const mongoose = require("mongoose");

const BackupSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "primary" },
    clientIdEncrypted: { type: String, default: "", select: false },
    clientSecretEncrypted: { type: String, default: "", select: false },
    tokenEncrypted: { type: String, default: "", select: false },
    resticPasswordEncrypted: { type: String, default: "", select: false },
    connectedAt: { type: Date, default: null },
    recoveryKitVerifiedAt: { type: Date, default: null },
    enabled: { type: Boolean, default: false },
    dailyTime: { type: String, default: "02:00" },
    lastScheduledOn: { type: String, default: "" },
    lastSuccessAt: { type: Date, default: null },
    lastSnapshotId: { type: String, default: "" },
    lastErrorAt: { type: Date, default: null },
    lastError: { type: String, default: "" },
    lastAlertAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BackupSettings", BackupSettingsSchema);
