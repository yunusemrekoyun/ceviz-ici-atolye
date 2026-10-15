const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildRichContentHtml,
  getYouTubeEmbedUrl,
} = require("../utils/richContent");
const sanitizeHtml = require("../utils/sanitizeHtml");

test("getYouTubeEmbedUrl watch linkini embed linkine cevirir", () => {
  assert.equal(
    getYouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
  );
});

test("buildRichContentHtml duz metin ve youtube blocklarini normalize eder", () => {
  const html = buildRichContentHtml(
    "Baslangic metni\n\nhttps://youtu.be/dQw4w9WgXcQ"
  );

  assert.match(html, /<p>Baslangic metni<\/p>/);
  assert.match(html, /<iframe/);
  assert.match(html, /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
});

test("buildRichContentHtml markdown link bloklarini anchor olarak normalize eder", () => {
  const html = buildRichContentHtml(
    "[Teklif Dosyasi](https://ornek.com/teklif)"
  );

  assert.match(html, /<a href="https:\/\/ornek\.com\/teklif"/);
  assert.match(html, />Teklif Dosyasi</);
});

test("sanitizeHtml yalnizca izinli youtube iframe kaynaklarini korur", () => {
  const safe = sanitizeHtml(
    '<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe>'
  );
  const unsafe = sanitizeHtml(
    '<iframe src="https://evil.example/embed/x"></iframe>'
  );

  assert.match(safe, /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
  assert.equal(unsafe, "");
});
