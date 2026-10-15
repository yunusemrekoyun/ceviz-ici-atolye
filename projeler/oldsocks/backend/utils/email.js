const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmailAddress(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isValidEmailAddress(value) {
  const email = normalizeEmailAddress(value);
  if (!email || email.length > 254) return false;
  return EMAIL_RE.test(email);
}

function splitEmailList(raw) {
  return String(raw || "")
    .split(",")
    .map((entry) => normalizeEmailAddress(entry))
    .filter((entry, index, arr) => isValidEmailAddress(entry) && arr.indexOf(entry) === index);
}

function sanitizeHeaderValue(value, maxLen = 160) {
  return String(value || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]+>/g, " ");
}

function clampText(value, maxLen) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLen);
}

function hasFilledHoneypot(value) {
  return String(value || "").trim().length > 0;
}

module.exports = {
  clampText,
  escapeHtml,
  hasFilledHoneypot,
  isValidEmailAddress,
  normalizeEmailAddress,
  sanitizeHeaderValue,
  splitEmailList,
  stripHtml,
};
