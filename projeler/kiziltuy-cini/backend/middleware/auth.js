const jwt = require("jsonwebtoken");

/*  Access-token doğrulama  */
exports.verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Login gerekli" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: "Token geçersiz veya süresi doldu" });
  }
};

/*  Sadece admin rolü geçsin  */
exports.isAdmin = (req, res, next) =>
  req.user?.role === "admin"
    ? next()
    : res.status(403).json({ error: "Admin yetkisi gerekli" });