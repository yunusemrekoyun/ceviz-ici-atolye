// backend/middleware/roles.js
exports.allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // auth middleware çalışmış ve req.user.role set edilmiş olmalı
    if (!req.user) {
      return res.status(401).json({ message: "Yetkilendirme bilgisi eksik" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Bu işlemi yapmaya yetkiniz yok" });
    }
    next();
  };
};
