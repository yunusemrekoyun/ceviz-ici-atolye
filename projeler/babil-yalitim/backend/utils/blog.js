const crypto = require("crypto");
const { sanitizePlainText, stripHtmlToText, titleCaseTag } = require("./text");

const STOP_WORDS = new Set([
  "ve",
  "veya",
  "ile",
  "için",
  "gibi",
  "çok",
  "daha",
  "ile",
  "bir",
  "bu",
  "şu",
  "olan",
  "olarak",
  "da",
  "de",
  "ki",
  "ya",
  "ama",
  "hem",
  "the",
  "and",
  "for",
  "with",
  "that",
  "from",
  "your",
  "you",
  "are",
  "blog",
  "yazi",
  "yazı",
  "icerik",
  "içerik",
]);

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8)
      .map(titleCaseTag);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return normalizeTags(parsed);
    } catch {
      // JSON değilse CSV gibi ele al.
    }

    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8)
      .map(titleCaseTag);
  }

  return [];
}

function deriveTags({ title = "", content = "" } = {}) {
  const normalizeWord = (word = "") => {
    const lowered = String(word || "").toLocaleLowerCase("tr-TR");
    const suffixes = [
      "lari",
      "leri",
      "lerin",
      "larin",
      "inde",
      "ında",
      "unda",
      "ünde",
      "daki",
      "deki",
      "taki",
      "teki",
      "lar",
      "ler",
      "nin",
      "nın",
      "nun",
      "nün",
      "dan",
      "den",
      "tan",
      "ten",
      "dir",
      "dır",
      "dur",
      "dür",
      "tir",
      "tır",
      "tur",
      "tür",
      "da",
      "de",
      "ta",
      "te",
      "yi",
      "yı",
      "yu",
      "yü",
      "i",
      "ı",
      "u",
      "ü",
    ];

    for (const suffix of suffixes) {
      if (
        lowered.endsWith(suffix) &&
        lowered.length - suffix.length >= 4
      ) {
        return lowered.slice(0, -suffix.length);
      }
    }

    return lowered;
  };

  const scoreWords = (text, weight, scores) => {
    const words = String(text || "")
      .toLocaleLowerCase("tr-TR")
      .match(/[\p{L}\p{N}]{3,}/gu) || [];

    for (const rawWord of words) {
      const word = normalizeWord(rawWord);
      if (!word || STOP_WORDS.has(word)) continue;
      if (/^\d+$/.test(word)) continue;
      scores.set(word, (scores.get(word) || 0) + weight);
    }
  };

  const scores = new Map();
  scoreWords(sanitizePlainText(title, 160), 3, scores);
  scoreWords(stripHtmlToText(content), 1, scores);

  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "tr"))
    .slice(0, 4)
    .map(([word]) => titleCaseTag(word));

  return ranked.length ? ranked : ["Genel"];
}

function resolveTags(rawTags, source) {
  const provided = normalizeTags(rawTags);
  return provided.length ? provided : deriveTags(source);
}

function isValidEmail(email = "") {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized || normalized.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

function hashEmail(email = "") {
  const salt = process.env.COMMENT_EMAIL_SALT || process.env.LIKE_SALT || "comment-email-salt";
  return crypto
    .createHash("sha256")
    .update(`${salt}|${String(email || "").trim().toLowerCase()}`)
    .digest("hex");
}

function maskEmail(email = "") {
  const normalized = String(email || "").trim().toLowerCase();
  const [local = "", domain = ""] = normalized.split("@");
  const [domainName = "", extension = ""] = domain.split(".");

  const maskPart = (value) => {
    if (!value) return "";
    if (value.length <= 2) return `${value[0] || ""}*`;
    return `${value.slice(0, 2)}${"*".repeat(Math.max(1, value.length - 2))}`;
  };

  const localMasked = maskPart(local);
  const domainMasked = maskPart(domainName);
  return extension
    ? `${localMasked}@${domainMasked}.${extension}`
    : `${localMasked}@${domainMasked}`;
}

function sanitizeCommentInput(payload = {}) {
  const name = sanitizePlainText(payload.name, 80);
  const email = String(payload.email || "").trim().toLowerCase();
  const body = sanitizePlainText(payload.body, 2000);

  if (!name || !email || !body) {
    const error = new Error("Ad, e-posta ve yorum alanları zorunludur.");
    error.status = 400;
    throw error;
  }

  if (!isValidEmail(email)) {
    const error = new Error("Geçerli bir e-posta adresi giriniz.");
    error.status = 400;
    throw error;
  }

  return {
    name,
    body,
    emailHash: hashEmail(email),
    emailMasked: maskEmail(email),
  };
}

function toPublicComment(comment = {}) {
  return {
    _id: comment._id,
    name: comment.name,
    body: comment.body,
    approved: Boolean(comment.approved),
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

module.exports = {
  normalizeTags,
  deriveTags,
  resolveTags,
  isValidEmail,
  sanitizeCommentInput,
  toPublicComment,
};
