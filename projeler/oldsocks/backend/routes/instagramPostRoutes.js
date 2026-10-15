// backend/routes/instagramPostRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/instagramPostController");

const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");

router.get("/admin", verifyToken, allowRoles("admin"), controller.getAllInstagramPosts);
router.get("/", controller.getPublicInstagramPosts);
router.post(
  "/",
  verifyToken,
  allowRoles("admin"),
  controller.createInstagramPost
);
router.put(
  "/:id",
  verifyToken,
  allowRoles("admin"),
  controller.updateInstagramPost
);
router.delete(
  "/:id",
  verifyToken,
  allowRoles("admin"),
  controller.deleteInstagramPost
);

module.exports = router;
