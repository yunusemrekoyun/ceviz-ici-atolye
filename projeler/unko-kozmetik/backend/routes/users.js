/********************************************************
 * backend/routes/users.js  (sadece admin)
 * Kullanıcının kendi profilini güncellemesi: PUT /api/auth/me
 ********************************************************/
const express = require("express");
const router = express.Router();
const User = require("../models/User.js");
const authMiddleware = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/requireAdmin");
const { HttpError, asyncHandler } = require("../utils/http");

router.use(authMiddleware, requireAdmin);

// Tüm kullanıcıları getirme
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: users,
      message: "Kullanıcılar başarıyla getirildi.",
    });
  })
);

// Kullanıcı silme
router.delete(
  "/:userId",
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (userId === String(req.user.id)) {
      throw new HttpError(400, "Kendi hesabınızı silemezsiniz.");
    }

    const user = await User.findById(userId);
    if (!user) throw new HttpError(404, "Kullanıcı bulunamadı.");

    if (
      user.role === "admin" &&
      (await User.countDocuments({ role: "admin" })) <= 1
    ) {
      throw new HttpError(400, "Sistemdeki son admin silinemez.");
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: "Kullanıcı başarıyla silindi.",
    });
  })
);

module.exports = router;
