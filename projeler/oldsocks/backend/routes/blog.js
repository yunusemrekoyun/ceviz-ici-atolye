const express = require("express");
const router = express.Router();

const blogCtrl = require("../controllers/blogController");
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");

// — Public —
// Tüm bloglar (isteğe bağlı ?tag=tagName ile filtrelenebilir)
router.get("/tags", blogCtrl.getTags);
router.get(
  "/admin",
  verifyToken,
  allowRoles("admin"),
  blogCtrl.getAdminBlogs
);
router.get(
  "/admin/:id",
  verifyToken,
  allowRoles("admin"),
  blogCtrl.getAdminBlog
);
router.get("/", blogCtrl.getBlogs);
// Tek bir blog (slug veya ID ile)
router.get("/:slugOrId", blogCtrl.getBlog);

// — Admin —
// Yeni blog oluştur (coverImage dosyası)
router.post(
  "/",
  verifyToken,
  allowRoles("admin"),
  blogCtrl.createBlog
);

// Mevcut blogu güncelle
router.put(
  "/:id",
  verifyToken,
  allowRoles("admin"),
  blogCtrl.updateBlog
);

// Blog sil
router.delete("/:id", verifyToken, allowRoles("admin"), blogCtrl.deleteBlog);

module.exports = router;
