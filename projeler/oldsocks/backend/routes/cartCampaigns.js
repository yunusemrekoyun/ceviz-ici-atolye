const router = require("express").Router();
const { verifyToken, attachUserUnlessExpired } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const ctrl = require("../controllers/cartCampaignController");

// Public
router.post("/preview", attachUserUnlessExpired, ctrl.previewCartPricing);
router.post("/check", attachUserUnlessExpired, ctrl.checkCartItems);
router.get("/header", ctrl.listHeaderCampaigns);

// Admin
router.use(verifyToken, allowRoles("admin"));
router.get("/", ctrl.listAdminCampaigns);
router.get("/:id", ctrl.getAdminCampaign);
router.post("/", ctrl.createCampaign);
router.put("/:id", ctrl.updateCampaign);
router.patch("/:id/toggle", ctrl.toggleCampaign);
router.delete("/:id", ctrl.deleteCampaign);

module.exports = router;
