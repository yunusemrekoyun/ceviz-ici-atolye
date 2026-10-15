/********************************************************
 * backend/utils/http.js
 ********************************************************/

// Route içinde beklenen hatalar için (doğrulama, yetki vb.)
class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// async route'lardaki hataları global error handler'a iletir
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Kullanıcı girdisini RegExp içinde güvenle kullanmak için
const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const exactMatch = (value) => new RegExp(`^${escapeRegex(value)}$`, "i");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = {
  HttpError,
  asyncHandler,
  escapeRegex,
  exactMatch,
  EMAIL_REGEX,
};
