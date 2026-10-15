const test = require("node:test");
const assert = require("node:assert/strict");
const StorefrontSettings = require("../models/StorefrontSettings");
const Product = require("../models/Product");
const controller = require("../controllers/storefrontController");

const sections = {
  new: { heading: "Yeni", source: "latest", productIds: [], shuffle: false },
  featured: { heading: "Öne çıkan", source: "random", productIds: [], shuffle: false },
  popular: { heading: "Popüler", source: "random", productIds: [], shuffle: false },
};

function response() {
  return {
    statusCode: 200,
    set() { return this; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

test("eski vitrin kaydı sıra ve görünürlük alanı olmasa da tüm alanları gösterir", async () => {
  const originalFindOne = StorefrontSettings.findOne;
  StorefrontSettings.findOne = async () => ({ fontPreset: "classic", heroButtonOpacity: 30, sections });
  try {
    const res = response();
    await controller.getAdmin({}, res);
    assert.deepEqual(res.body.sectionOrder, ["new", "featured", "popular"]);
    assert.equal(res.body.sections.new.visible, true);
    assert.equal(res.body.sections.featured.visible, true);
    assert.equal(res.body.sections.popular.visible, true);
    assert.deepEqual(res.body.cartRecommendations, {
      visible: true,
      heading: "Sepetinize yakışabilecek ürünler",
      productIds: [],
    });
    assert.equal(res.body.similarProductsVisible, true);
  } finally {
    StorefrontSettings.findOne = originalFindOne;
  }
});

test("sepet önerisi görünürlüğü saklanır; eski yönetim kaydı bu ayarı korur", async () => {
  const originalFindOne = StorefrontSettings.findOne;
  const originalUpdate = StorefrontSettings.findOneAndUpdate;
  const savedRecommendations = { visible: false, heading: "Sizin için", productIds: [] };
  let saved;
  StorefrontSettings.findOne = async () => ({ fontPreset: "classic", heroButtonOpacity: 30, sections, cartRecommendations: savedRecommendations, similarProductsVisible: false });
  StorefrontSettings.findOneAndUpdate = async (_filter, update) => {
    saved = update.$set;
    return saved;
  };
  try {
    const initial = response();
    await controller.update({ body: {
      fontPreset: "classic",
      heroButtonOpacity: 30,
      sections,
      cartRecommendations: savedRecommendations,
      similarProductsVisible: false,
    } }, initial);
    assert.equal(initial.statusCode, 200);

    const res = response();
    await controller.update({ body: {
      fontPreset: "classic",
      heroButtonOpacity: 30,
      sections,
    } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(saved.cartRecommendations, savedRecommendations);
    assert.deepEqual(res.body.cartRecommendations, savedRecommendations);
    assert.equal(saved.similarProductsVisible, false);

    const invalid = response();
    await controller.update({ body: {
      fontPreset: "classic",
      sections,
      cartRecommendations: { visible: true, heading: "Test", productIds: ["geçersiz"] },
    } }, invalid);
    assert.equal(invalid.statusCode, 400);
  } finally {
    StorefrontSettings.findOne = originalFindOne;
    StorefrontSettings.findOneAndUpdate = originalUpdate;
  }
});

test("sepette öncelikli ürün sırası kaydedilir", async () => {
  const originalFindOne = StorefrontSettings.findOne;
  const originalUpdate = StorefrontSettings.findOneAndUpdate;
  const originalCount = Product.countDocuments;
  const ids = ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"];
  let saved;
  StorefrontSettings.findOne = async () => ({ fontPreset: "classic", heroButtonOpacity: 30, sections });
  StorefrontSettings.findOneAndUpdate = async (_filter, update) => {
    saved = update.$set;
    return saved;
  };
  Product.countDocuments = async () => ids.length;
  try {
    const result = response();
    await controller.update({ body: {
      fontPreset: "classic",
      sections,
      cartRecommendations: { visible: true, heading: "Sepet önerileri", productIds: ids },
    } }, result);
    assert.equal(result.statusCode, 200);
    assert.deepEqual(saved.cartRecommendations.productIds, ids);
    assert.deepEqual(result.body.cartRecommendations.productIds, ids);
  } finally {
    StorefrontSettings.findOne = originalFindOne;
    StorefrontSettings.findOneAndUpdate = originalUpdate;
    Product.countDocuments = originalCount;
  }
});

test("vitrin sırası kaydedilir; eksik veya yinelenen alan reddedilir", async () => {
  const originalFindOne = StorefrontSettings.findOne;
  const originalUpdate = StorefrontSettings.findOneAndUpdate;
  let saved;
  StorefrontSettings.findOne = async () => ({ fontPreset: "classic", heroButtonOpacity: 30, sections });
  StorefrontSettings.findOneAndUpdate = async (_filter, update) => {
    saved = update.$set;
    return saved;
  };
  try {
    const body = {
      fontPreset: "classic",
      heroButtonOpacity: 30,
      sectionOrder: ["popular", "new", "featured"],
      sections: { ...sections, featured: { ...sections.featured, visible: false } },
    };
    const res = response();
    await controller.update({ body }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(saved.sectionOrder, body.sectionOrder);
    assert.deepEqual(res.body.sectionOrder, body.sectionOrder);
    assert.equal(saved.sections.featured.visible, false);
    assert.equal(res.body.sections.featured.visible, false);

    const invalid = response();
    await controller.update({ body: { ...body, sectionOrder: ["new", "new", "popular"] } }, invalid);
    assert.equal(invalid.statusCode, 400);
    assert.deepEqual(saved.sectionOrder, body.sectionOrder);
  } finally {
    StorefrontSettings.findOne = originalFindOne;
    StorefrontSettings.findOneAndUpdate = originalUpdate;
  }
});

test("eski yönetim sekmesi kaydederse gizli ürün alanı yeniden açılmaz", async () => {
  const originalFindOne = StorefrontSettings.findOne;
  const originalUpdate = StorefrontSettings.findOneAndUpdate;
  const hiddenSections = { ...sections, featured: { ...sections.featured, source: "category", categoryId: null, visible: false } };
  let saved;
  StorefrontSettings.findOne = async () => ({
    fontPreset: "classic",
    heroButtonOpacity: 30,
    sectionOrder: ["new", "featured", "popular"],
    sections: hiddenSections,
  });
  StorefrontSettings.findOneAndUpdate = async (_filter, update) => {
    saved = update.$set;
    return saved;
  };
  try {
    const hide = response();
    await controller.update({ body: {
      fontPreset: "classic",
      heroButtonOpacity: 30,
      sectionOrder: ["new", "featured", "popular"],
      sections: hiddenSections,
    } }, hide);
    assert.equal(hide.statusCode, 200);
    assert.equal(saved.sections.featured.categoryId, null);

    const res = response();
    await controller.update({ body: {
      fontPreset: "classic",
      heroButtonOpacity: 30,
      sectionOrder: ["new", "featured", "popular"],
      sections,
    } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(saved.sections.featured.visible, false);
  } finally {
    StorefrontSettings.findOne = originalFindOne;
    StorefrontSettings.findOneAndUpdate = originalUpdate;
  }
});
