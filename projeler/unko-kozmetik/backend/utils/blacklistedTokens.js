/********************************************************
 * backend/utils/blacklistedTokens.js
 * Çıkış yapılmış token'lar süreleri dolana kadar bellekte tutulur.
 ********************************************************/
const jwt = require("jsonwebtoken");

const tokens = new Map(); // token -> son geçerlilik zamanı (ms)

const prune = () => {
  const now = Date.now();
  for (const [token, exp] of tokens) {
    if (exp <= now) tokens.delete(token);
  }
};

const add = (token) => {
  if (!token) return;
  const decoded = jwt.decode(token);
  const exp = decoded?.exp
    ? decoded.exp * 1000
    : Date.now() + 7 * 24 * 60 * 60 * 1000;
  prune();
  tokens.set(token, exp);
};

const has = (token) => {
  const exp = tokens.get(token);
  if (!exp) return false;
  if (exp <= Date.now()) {
    tokens.delete(token);
    return false;
  }
  return true;
};

module.exports = { add, has };
