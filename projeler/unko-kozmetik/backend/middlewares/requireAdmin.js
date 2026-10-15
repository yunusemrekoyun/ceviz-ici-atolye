/********************************************************
 * backend/middlewares/requireAdmin.js
 * authMiddleware'den sonra kullanılmalıdır.
 ********************************************************/
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Bu işlemi sadece adminler gerçekleştirebilir.",
    });
  }
  next();
};

module.exports = requireAdmin;
