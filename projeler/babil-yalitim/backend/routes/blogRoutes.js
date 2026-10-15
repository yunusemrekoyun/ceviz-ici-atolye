const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const { upload, compressIfNeeded } = require("../middleware/uploadMedia"); // disk tmp, image+video kabul eder
const rateLimit = require("express-rate-limit");

const {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  setBlogOrder,
  deleteAsset,
  getBlogTranslations,
  updateBlogTranslations,
  // comments
  getApprovedComments,
  createComment,
  getAllComments,
  setCommentApproval,
  deleteComment,
} = require("../controller/blogController");

const commentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

/* -------- public -------- */
router.get("/", getBlogs);
router.get("/:id", getBlogById);

// public comments
router.get("/:id/comments", getApprovedComments);
router.post("/:id/comments", commentLimiter, createComment);

/* -------- protected (admin) -------- */
router.post(
  "/",
  verifyToken,
  upload.fields([
    { name: "cover", maxCount: 1 }, // zorunlu (image)
    { name: "assets", maxCount: 30 }, // opsiyonel (image|video karışık)
  ]),
  compressIfNeeded,
  createBlog
);

router.put(
  "/:id",
  verifyToken,
  upload.fields([
    { name: "cover", maxCount: 1 },
    { name: "assets", maxCount: 30 },
  ]),
  compressIfNeeded,
  updateBlog
);

router.patch("/:id/order", verifyToken, setBlogOrder);
router.get("/:id/translations", verifyToken, getBlogTranslations);
router.put("/:id/translations", verifyToken, updateBlogTranslations);

router.delete("/:id", verifyToken, deleteBlog);

// tek asset silme
router.delete("/:id/assets/:mediaKey", verifyToken, deleteAsset);

// admin: comment moderation
router.get("/:id/comments/all", verifyToken, getAllComments);
router.patch(
  "/:id/comments/:commentId/approve",
  verifyToken,
  setCommentApproval
);
router.delete("/:id/comments/:commentId", verifyToken, deleteComment);

module.exports = router;
