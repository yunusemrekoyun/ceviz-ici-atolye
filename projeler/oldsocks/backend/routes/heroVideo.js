// backend/routes/heroVideo.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const ctrl = require("../controllers/heroVideoController");

// Admin video yükleme
router.post(
  "/",
  verifyToken,
  allowRoles("admin"),
  ctrl.uploadVideo
);

// Admin sıralama güncelleme ("/:id" kalıbından önce tanımlanır)
router.patch("/order", verifyToken, allowRoles("admin"), ctrl.reorderHeroVideos);

// Admin video silme
router.delete("/:id", verifyToken, allowRoles("admin"), ctrl.deleteHeroVideo);

// Herkese açık video listesi
router.get("/", ctrl.getHeroVideos);

module.exports = router;
