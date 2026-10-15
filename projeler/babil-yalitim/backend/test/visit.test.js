const test = require("node:test");
const assert = require("node:assert/strict");
const { guessSection, anonymizeIp } = require("../controller/visitController");

test("guessSection locale prefixini dikkate alir", () => {
  assert.equal(guessSection("/en/services"), "services");
  assert.equal(guessSection("/en/blog/abc"), "blog");
  assert.equal(guessSection("/en/journal"), "journal");
});

test("guessSection project detail yolunu projects olarak siniflandirir", () => {
  assert.equal(guessSection("/project-detail/123"), "projects");
  assert.equal(guessSection("/en/project-detail/123"), "projects");
});

test("guessSection statik sayfalari ayirt eder", () => {
  assert.equal(guessSection("/about"), "about");
  assert.equal(guessSection("/whyus"), "whyus");
  assert.equal(guessSection("/iletisim"), "contact");
  assert.equal(guessSection("/kvkk"), "kvkk");
  assert.equal(guessSection("/"), "home");
});

test("anonymizeIp ipv4 ve ipv6 adreslerini maskeler", () => {
  assert.equal(anonymizeIp("192.168.1.42"), "192.168.1.0");
  assert.equal(anonymizeIp("2001:0db8:85a3:0000:0000:8a2e:0370:7334"), "2001:0db8:85a3:0000::");
});
