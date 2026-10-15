// backend/middleware/verifyToken.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const NEED_CSRF = ["POST", "PUT", "PATCH", "DELETE"];
const CSRF_SKIP_PATHS = new Set([
  "/api/auth/login", // login'de csrf aramayın
]);

module.exports = (req, res, next) => {
  if (!JWT_SECRET) {
    return res
      .status(500)
      .json({ message: "Sunucu yapılandırma hatası: JWT_SECRET yok." });
  }

  // 1) Token: Cookie (tercih), yoksa Authorization header
  const cookieToken = req.cookies?.accessToken;
  const authHeader = req.headers["authorization"];
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  const token = cookieToken || bearerToken;
  if (!token) {
    return res.status(401).json({ message: "Token gerekli" });
  }

  // 2) CSRF: sadece state-changing ve skip listede değilse
  if (NEED_CSRF.includes(req.method) && !CSRF_SKIP_PATHS.has(req.path)) {
    const headerToken = req.headers["x-csrf-token"];
    const cookieCsrf = req.cookies?.csrfToken;
    if (!headerToken || !cookieCsrf || headerToken !== cookieCsrf) {
      return res.status(403).json({ message: "CSRF doğrulaması başarısız." });
    }
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res
      .status(403)
      .json({ message: "Token geçersiz veya süresi dolmuş" });
  }
};
