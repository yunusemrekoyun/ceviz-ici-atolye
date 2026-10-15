const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const ctrl = require("../controllers/blogReplyController");

const replyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || ipKeyGenerator(req.ip),
});

// — Admin paneli için —
// Tüm yanıtları listele
router.get("/replies", verifyToken, allowRoles("admin"), ctrl.getAllReplies);
// Tek bir yanıtı getir
router.get("/replies/:id", verifyToken, allowRoles("admin"), ctrl.getReply);
// Yanıtı onayla
router.patch(
  "/replies/:id/approve",
  verifyToken,
  allowRoles("admin"),
  ctrl.approveReply
);

router.patch(
  "/replies/mark-seen",
  verifyToken,
  allowRoles("admin"),
  ctrl.markAllRepliesSeen
);

// Yanıt sil
router.delete("/replies/:id", verifyToken, ctrl.deleteReply);

// — Public / Kullanıcı işlemleri —
// Bir yorumun onaylı yanıtlarını getir (→ GET /comments/:commentId/replies)
router.get("/comments/:commentId/replies", ctrl.getRepliesByComment);
// Yeni yanıt ekle (login required)
// → POST /comments/:commentId/replies
router.post(
  "/comments/:commentId/replies",
  verifyToken,
  replyLimiter,
  ctrl.createReply
);

module.exports = router;
