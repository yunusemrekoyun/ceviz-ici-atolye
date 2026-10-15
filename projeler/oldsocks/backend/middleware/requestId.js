const crypto = require("node:crypto");

module.exports = function requestId(req, res, next) {
  const incoming = String(req.header("X-Request-Id") || "").trim();
  req.requestId = /^[a-zA-Z0-9._-]{8,100}$/.test(incoming)
    ? incoming
    : crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
};
