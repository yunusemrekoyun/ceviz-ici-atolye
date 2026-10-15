const mongoose = require("mongoose");

const VisitStatsSchema = new mongoose.Schema({
  type: { type: String, enum: ["product", "blog"], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  date: { type: String, required: true }, // "2025-06-17" gibi tutulacak
  visitCount: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 }, // millisaniye cinsinden
});

VisitStatsSchema.index({ type: 1, targetId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("VisitStats", VisitStatsSchema);
