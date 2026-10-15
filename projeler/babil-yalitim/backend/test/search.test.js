const test = require("node:test");
const assert = require("node:assert/strict");
const {
  escapeRegex,
  buildSearchRegex,
  buildMongoTokenQuery,
  normalizeSearchQuery,
  tokenizeSearchQuery,
  scoreSearchDocument,
  buildExcerpt,
} = require("../utils/search");

test("escapeRegex regex operatorlerini kacislar", () => {
  assert.equal(escapeRegex("su+yali(tim)"), "su\\+yali\\(tim\\)");
});

test("normalizeSearchQuery bosluklari normalize eder", () => {
  assert.equal(normalizeSearchQuery("  su   yalitim "), "su yalitim");
});

test("buildSearchRegex kisa sorguda null doner", () => {
  assert.equal(buildSearchRegex("a"), null);
});

test("buildSearchRegex birden fazla kelimeyi esnek eslestirir", () => {
  const regex = buildSearchRegex("su yalitim");
  assert.ok(regex);
  assert.equal(regex.test("Su ve temel yalitim cozumleri"), true);
});

test("tokenizeSearchQuery benzersiz token listesi uretir", () => {
  assert.deepEqual(tokenizeSearchQuery("su yalitim su"), ["su", "yalitim"]);
});

test("buildMongoTokenQuery tokenleri alanlara yayarak sorgu uretir", () => {
  const query = buildMongoTokenQuery(["title", "category"], "su yalitim");
  assert.equal(Array.isArray(query.$and), true);
  assert.equal(query.$and.length, 2);
  assert.equal(Array.isArray(query.$and[0].$or), true);
});

test("scoreSearchDocument baslik ve kategori eslesmesine daha yuksek puan verir", () => {
  const direct = scoreSearchDocument(
    [
      { value: "Su Yalitimi", weight: 16, label: "Baslik" },
      { value: "Temel", weight: 8, label: "Kategori" },
    ],
    "su yalitim"
  );

  const weak = scoreSearchDocument(
    [{ value: "Dis cephe uygulamasi", weight: 4, label: "Aciklama" }],
    "su yalitim"
  );

  assert.equal(direct.score > weak.score, true);
  assert.deepEqual(direct.matchedFields, ["Baslik"]);
});

test("buildExcerpt eslesen bolumden kirpilmis ozet uretir", () => {
  const excerpt = buildExcerpt(
    "Uzun bir metin. Su yalitimi uygulamalari temel ve cati detaylarinda önemlidir.",
    "yalitim"
  );

  assert.match(excerpt.toLowerCase(), /yalitim/);
  assert.equal(excerpt.length <= 183, true);
});
