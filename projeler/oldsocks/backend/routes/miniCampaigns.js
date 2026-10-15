// backend/routes/miniCampaigns.js
const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/miniCampaignController");
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");

// — Public —
// Tüm mini kampanyalar
router.get("/", ctrl.getMiniCampaigns);
// Aktif slot 1 ve slot 2 kampanyalarını döner
router.get("/active", ctrl.getActiveMiniCampaigns);
// Tek bir mini kampanya
router.get("/:id", ctrl.getMiniCampaign);

// — Admin —
// Yeni oluştur
router.post(
  "/",
  verifyToken,
  allowRoles("admin"),
  ctrl.createMiniCampaign
);
// Güncelle
router.put(
  "/:id",
  verifyToken,
  allowRoles("admin"),
  ctrl.updateMiniCampaign
);
// Sil
router.delete(
  "/:id",
  verifyToken,
  allowRoles("admin"),
  ctrl.deleteMiniCampaign
);
// Slot atama (1 veya 2)
router.patch(
  "/:id/activate",
  verifyToken,
  allowRoles("admin"),
  ctrl.setActiveMiniCampaign
);
// Yayından kaldır (slot boşalır)
router.patch(
  "/:id/deactivate",
  verifyToken,
  allowRoles("admin"),
  ctrl.deactivateMiniCampaign
);

module.exports = router;
