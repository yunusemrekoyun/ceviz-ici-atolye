// backend/routes/campaign.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const ctrl = require("../controllers/campaignController");

// Public
// Tam liste ve tek kampanya yalnız yönetim ekranı için; mağaza /active'i kullanır.
router.get("/", verifyToken, allowRoles("admin"), ctrl.getCampaigns);
router.get("/active", ctrl.getActiveCampaign);
router.get("/:id", verifyToken, allowRoles("admin"), ctrl.getCampaign);

// Admin
router.post(
  "/",
  verifyToken,
  allowRoles("admin"),
  ctrl.createCampaign
);
router.put(
  "/:id",
  verifyToken,
  allowRoles("admin"),
  ctrl.updateCampaign
);
router.delete("/:id", verifyToken, allowRoles("admin"), ctrl.deleteCampaign);
router.patch(
  "/:id/activate",
  verifyToken,
  allowRoles("admin"),
  ctrl.setActiveCampaign
);
router.patch(
  "/:id/deactivate",
  verifyToken,
  allowRoles("admin"),
  ctrl.deactivateCampaign
);

module.exports = router;
