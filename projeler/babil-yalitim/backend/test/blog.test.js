const test = require("node:test");
const assert = require("node:assert/strict");
const {
  deriveTags,
  normalizeTags,
  sanitizeCommentInput,
} = require("../utils/blog");

test("normalizeTags csv girdisini temizler ve title case yapar", () => {
  assert.deepEqual(normalizeTags("yalitim, su izolasyonu , çatı"), [
    "Yalitim",
    "Su izolasyonu",
    "Çatı",
  ]);
});

test("deriveTags içerikten otomatik etiket üretir", () => {
  const tags = deriveTags({
    title: "Su Yalitiminda Dikkat Edilmesi Gerekenler",
    content: "<p>Su yalitimi bina omru icin kritik bir yatirimdir.</p>",
  });

  assert.ok(tags.length >= 1);
  assert.ok(tags.some((tag) => /Yalitim|Dikkat|Bina/i.test(tag)));
});

test("sanitizeCommentInput e-postayi hash/maskeler ve body temizler", () => {
  const result = sanitizeCommentInput({
    name: "  Ayse  ",
    email: "AYSE@example.com",
    body: "<b>Merhaba</b> dunya",
  });

  assert.equal(result.name, "Ayse");
  assert.equal(result.body, "Merhaba dunya");
  assert.match(result.emailMasked, /@/);
  assert.ok(result.emailHash);
});
