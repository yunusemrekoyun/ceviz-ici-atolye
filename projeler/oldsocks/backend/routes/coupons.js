const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const ctrl = require("../controllers/couponController");

router.use(verifyToken, allowRoles("admin"));
router.get("/", ctrl.listAdminCoupons);
router.get("/:id", ctrl.getAdminCoupon);
router.post("/", ctrl.createCoupon);
router.put("/:id", ctrl.updateCoupon);
router.patch("/:id/toggle", ctrl.toggleCoupon);
router.delete("/:id", ctrl.deleteCoupon);

module.exports = router;
