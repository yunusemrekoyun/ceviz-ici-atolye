const mongoose = require("mongoose");

// Yasal metinler (sözleşme, ön bilgilendirme, KVKK, çerez). Her yayın yeni bir
// sürüm olarak saklanır; siparişteki onay hangi sürümün onaylandığını gösterir.
const LEGAL_DOCUMENT_KEYS = Object.freeze(["pre-information", "distance-sales", "kvkk", "cookies"]);

const LegalDocumentSchema = new mongoose.Schema(
  {
    key: { type: String, enum: LEGAL_DOCUMENT_KEYS, required: true },
    version: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 200000 },
    publishedAt: { type: Date, default: Date.now },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { versionKey: false }
);

LegalDocumentSchema.index({ key: 1, version: -1 }, { unique: true });

module.exports = mongoose.model("LegalDocument", LegalDocumentSchema);
module.exports.LEGAL_DOCUMENT_KEYS = LEGAL_DOCUMENT_KEYS;
