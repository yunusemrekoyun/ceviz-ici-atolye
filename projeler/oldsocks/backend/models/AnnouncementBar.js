const mongoose = require("mongoose");

const AnnouncementBarSchema = new mongoose.Schema(
  {
    /** Bant metni (örn: “Tüm siparişlerde ücretsiz kargo!”) */
    text: { type: String, required: true, trim: true },

    /** Gösterilsin mi? */
    enabled: { type: Boolean, default: false, index: true },

    /** Stil — opsiyonel (frontend isterse kullanır) */
    bgColor: { type: String, default: "#000000" }, // siyah
    textColor: { type: String, default: "#ffffff" }, // beyaz
  },
  { timestamps: true }
);

/** Koleksiyonda tek kayıt tutulacak (singleton yaklaşımı) */
module.exports = mongoose.model("AnnouncementBar", AnnouncementBarSchema);
