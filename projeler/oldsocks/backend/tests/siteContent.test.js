const test = require("node:test");
const assert = require("node:assert/strict");
const SiteContent = require("../models/SiteContent");
const MediaReference = require("../models/MediaReference");
const controller = require("../controllers/siteContentController");
const { publicContent } = controller;

function response() {
  return {
    statusCode: 200,
    set() { return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

test("ilk kurulumda mevcut Hakkımızda, logo ve iletişim metinleri korunur", () => {
  const content = publicContent(null);
  assert.equal(content.logo, null);
  assert.equal(content.logoAssetId, null);
  assert.equal(content.about.vision.heading, "Vizyonumuz");
  assert.match(content.about.history.body, /2021’de Kütahya’da/);
  assert.equal(content.footer.address, "Alipaşa mahallesi üçbey sokak no7/A Kütahya Merkez");
  assert.equal(content.contact.email, "oldscks@gmail.com");
});

test("site içeriği ve görseller mevcut medya yedekleme bağlantılarına uygundur", () => {
  const doc = new SiteContent();
  assert.equal(doc.visionHeading, "Vizyonumuz");
  assert.equal(doc.contactPhone, "+90 541 428 29 89");
  assert.ok(MediaReference.OWNER_TYPES.includes("SiteContent"));
});

test("metinler kaydedilir, boş görsel alanları varsayılan görseli korur ve güvensiz bağlantı reddedilir", async () => {
  const originalFindOne = SiteContent.findOne;
  const originalFindOneAndUpdate = SiteContent.findOneAndUpdate;
  const originalReferencesFind = MediaReference.find;
  let saved = null;
  SiteContent.findOne = () => ({
    populate() { return this; },
    then(resolve, reject) { return Promise.resolve(saved).then(resolve, reject); },
  });
  SiteContent.findOneAndUpdate = async (_filter, update) => {
    saved = { _id: "507f1f77bcf86cd799439011", ...update.$set };
    return saved;
  };
  MediaReference.find = async () => [];
  try {
    const invalid = response();
    await controller.update({ body: { footer: { facebookUrl: "javascript:alert(1)" } } }, invalid);
    assert.equal(invalid.statusCode, 400);
    assert.equal(saved, null);

    const result = response();
    await controller.update({ body: {
      logoAssetId: null,
      about: { vision: { heading: "Yeni vizyon", body: "Yeni metin", imageAssetId: null } },
      footer: { description: "Yeni marka metni" },
    } }, result);
    assert.equal(result.statusCode, 200);
    assert.equal(result.body.about.vision.heading, "Yeni vizyon");
    assert.equal(result.body.footer.description, "Yeni marka metni");
    assert.equal(result.body.logoAssetId, null);
    assert.equal(result.body.contact.email, "oldscks@gmail.com");
  } finally {
    SiteContent.findOne = originalFindOne;
    SiteContent.findOneAndUpdate = originalFindOneAndUpdate;
    MediaReference.find = originalReferencesFind;
  }
});
