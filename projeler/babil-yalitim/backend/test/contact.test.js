const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validateContactPayload,
  buildContactMail,
} = require("../utils/contact");

test("validateContactPayload gecersiz honeypot alanini reddeder", () => {
  assert.throws(
    () =>
      validateContactPayload({
        name: "Test",
        email: "test@example.com",
        message: "Merhaba",
        company: "spam",
      }),
    /Geçersiz istek|Gecersiz istek/
  );
});

test("validateContactPayload zorunlu alanlari temizler", () => {
  const payload = validateContactPayload({
    name: "  Ali Veli ",
    email: "Ali@example.com",
    message: "<p>Teklif almak istiyorum</p>",
  });

  assert.equal(payload.name, "Ali Veli");
  assert.equal(payload.email, "ali@example.com");
  assert.equal(payload.message, "Teklif almak istiyorum");
});

test("buildContactMail metin ve html govdesi uretir", () => {
  const mail = buildContactMail({
    name: "Ali Veli",
    email: "ali@example.com",
    message: "Merhaba",
    origin: "https://example.com/iletisim",
  });

  assert.match(mail.subject, /Ali Veli/);
  assert.match(mail.text, /ali@example.com/);
  assert.match(mail.html, /https:\/\/example.com\/iletisim/);
});
