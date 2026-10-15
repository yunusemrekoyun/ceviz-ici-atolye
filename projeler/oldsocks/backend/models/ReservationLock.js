const mongoose = require("mongoose");

// Eşzamanlı işlemleri sıraya sokmak için kilit kaydı: işlem önce bu kayda yazar, böylece
// sonraki sayım diğerinin sonucunu görür. Anahtarlar: bağlantı (IP) başına açık stok
// ayrımı sayımı ve "coupon:<id>" ile ödeme anındaki kupon kuralı denetimi.
const ReservationLockSchema = new mongoose.Schema(
  {
    _id: { type: String },
    at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

ReservationLockSchema.index({ at: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

module.exports = mongoose.model("ReservationLock", ReservationLockSchema);
