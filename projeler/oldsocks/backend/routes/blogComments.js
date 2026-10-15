// backend/routes/blogComments.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const ctrl = require("../controllers/blogCommentController");

const commentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || ipKeyGenerator(req.ip),
});

// Admin paneli
router.get("/", verifyToken, allowRoles("admin"), ctrl.getAllComments);
router.get("/:id", verifyToken, allowRoles("admin"), ctrl.getComment);
router.patch(
  "/:id/approve",
  verifyToken,
  allowRoles("admin"),
  ctrl.approveComment
);
router.patch(
  "/mark-seen",
  verifyToken,
  allowRoles("admin"),
  ctrl.markAllCommentsSeen
);

// Public ve kullanıcı
router.get("/blogs/:blogId/comments", ctrl.getCommentsByBlog);
router.post(
  "/blogs/:blogId/comments",
  verifyToken,
  commentLimiter,
  ctrl.createComment
);

// Silme
router.delete("/:id", verifyToken, ctrl.deleteComment);

module.exports = router;
