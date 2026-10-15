// backend/middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function resolveTokenUser(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(payload.userId).select("role tokenVersion");
  if (!user) {
    const err = new Error("Kullanıcı bulunamadı");
    err.status = 401;
    throw err;
  }

  const payloadTokenVersion = Number(payload?.tokenVersion || 0);
  const currentTokenVersion = Number(user?.tokenVersion || 0);

  if (payloadTokenVersion !== currentTokenVersion) {
    const err = new Error("Oturum geçerliliğini yitirdi");
    err.status = 401;
    throw err;
  }

  return { userId: String(user._id), role: user.role };
}

const JWT_ERRORS = new Set(["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"]);

exports.verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token bulunamadı" });
  }

  const token = authHeader.split(" ")[1];
  try {
    req.user = await resolveTokenUser(token);
    next();
  } catch (err) {
    if (err?.status === 401) {
      return res.status(401).json({ message: err.message });
    }
    if (JWT_ERRORS.has(err?.name)) {
      return res
        .status(403)
        .json({ message: "Token geçersiz veya süresi dolmuş" });
    }
    // Veritabanı gibi geçici bir hata: oturumu geçersiz sayma.
    console.error("[Auth] Token doğrulanamadı:", err?.message || err);
    return res.status(503).json({ message: "Hizmet geçici olarak kullanılamıyor. Lütfen tekrar deneyin." });
  }
};

exports.attachUserIfPresent = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    req.user = await resolveTokenUser(token);
  } catch {
    // Public endpointlerde hatalı token yüzünden isteği bloklamıyoruz.
  }
  return next();
};

// Sonucu kimliğe göre değişen public uçlar (sepet stok kontrolü, fiyat önizlemesi): süresi
// dolmuş token sessizce misafir sayılmaz; 401 döner, istemci oturumu yenileyip tekrarlar.
// Diğer token hataları misafir sayılır.
exports.attachUserUnlessExpired = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  try {
    req.user = await resolveTokenUser(authHeader.split(" ")[1]);
  } catch (err) {
    if (err?.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Oturum süresi doldu." });
    }
  }
  return next();
};
