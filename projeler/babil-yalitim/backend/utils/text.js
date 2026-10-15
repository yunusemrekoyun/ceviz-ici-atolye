const { JSDOM } = require("jsdom");

function normalizeWhitespace(input = "") {
  return String(input || "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtmlToText(input = "") {
  if (!input || typeof input !== "string") return "";
  const dom = new JSDOM(`<body>${input}</body>`);
  return normalizeWhitespace(dom.window.document.body.textContent || "");
}

function sanitizePlainText(input = "", maxLength = 500) {
  return stripHtmlToText(String(input || "")).slice(0, maxLength);
}

function titleCaseTag(input = "") {
  const value = normalizeWhitespace(input);
  if (!value) return "";
  return value.charAt(0).toLocaleUpperCase("tr-TR") + value.slice(1);
}

module.exports = {
  normalizeWhitespace,
  stripHtmlToText,
  sanitizePlainText,
  titleCaseTag,
};
