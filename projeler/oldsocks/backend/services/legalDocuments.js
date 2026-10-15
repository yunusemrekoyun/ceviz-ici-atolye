const LegalDocument = require("../models/LegalDocument");
const { LEGAL_DOCUMENT_KEYS } = require("../models/LegalDocument");
const { timedCache } = require("./timedCache");

const cache = timedCache(60 * 1000);

// Her metnin yayındaki (en son) sürümü. Hiç yayın yoksa o metin için sitedeki ilk metin geçerlidir.
async function currentDocuments() {
  return cache.get(async () => {
    const latest = await LegalDocument.aggregate([
      { $sort: { key: 1, version: -1 } },
      { $group: { _id: "$key", doc: { $first: "$$ROOT" } } },
    ]);
    const map = {};
    for (const { _id, doc } of latest) {
      if (!LEGAL_DOCUMENT_KEYS.includes(_id)) continue;
      map[_id] = { title: doc.title, body: doc.body, version: doc.version, publishedAt: doc.publishedAt };
    }
    return map;
  });
}

function invalidateLegalDocuments() {
  cache.invalidate();
}

// Siparişe ve e-postaya yazılan onay sürümü: ön bilgilendirme ve sözleşmenin sürümleri.
async function consentVersionLabel() {
  const docs = await currentDocuments();
  const part = (key, name) => {
    const doc = docs[key];
    if (!doc) return `${name}: ilk metin`;
    const date = new Date(doc.publishedAt).toLocaleDateString("tr-TR");
    return `${name}: sürüm ${doc.version} (${date})`;
  };
  return `${part("pre-information", "ön bilgilendirme")}, ${part("distance-sales", "sözleşme")}`;
}

module.exports = { currentDocuments, invalidateLegalDocuments, consentVersionLabel };
