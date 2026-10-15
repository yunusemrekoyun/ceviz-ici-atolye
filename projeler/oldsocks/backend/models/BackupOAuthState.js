const mongoose = require("mongoose");

const BackupOAuthStateSchema = new mongoose.Schema({
  stateHash: { type: String, required: true, unique: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

module.exports = mongoose.model("BackupOAuthState", BackupOAuthStateSchema);
