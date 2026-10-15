const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/announcementBarController");
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");

// Public: aktif bar
router.get("/", ctrl.getPublicBar);

// Admin: oku & yaz
router.get("/admin", verifyToken, allowRoles("admin"), ctrl.getAdminBar);
router.put("/admin", verifyToken, allowRoles("admin"), ctrl.upsertBar);
router.delete("/admin", verifyToken, allowRoles("admin"), ctrl.deleteBar);

module.exports = router;
