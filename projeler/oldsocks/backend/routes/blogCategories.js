// backend/routes/blogCategories.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/blogCategoryController");
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");

// Public
router.get("/", ctrl.getBlogCategories);
router.get("/:id", ctrl.getBlogCategory);

// Admin-only
router.post("/", verifyToken, allowRoles("admin"), ctrl.createBlogCategory);
router.put("/:id", verifyToken, allowRoles("admin"), ctrl.updateBlogCategory);
router.delete(
  "/:id",
  verifyToken,
  allowRoles("admin"),
  ctrl.deleteBlogCategory
);

module.exports = router;
