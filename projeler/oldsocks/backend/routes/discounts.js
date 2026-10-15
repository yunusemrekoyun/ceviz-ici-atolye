const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const ctrl = require("../controllers/discountController");

// Admin
router.get("/", verifyToken, allowRoles("admin"), ctrl.listDiscounts);
router.get("/:id", verifyToken, allowRoles("admin"), ctrl.getDiscount);
router.post("/", verifyToken, allowRoles("admin"), ctrl.createDiscount);
router.put("/:id", verifyToken, allowRoles("admin"), ctrl.updateDiscount);
router.put(
  "/:id/toggle",
  verifyToken,
  allowRoles("admin"),
  ctrl.toggleDiscount
);
router.delete("/:id", verifyToken, allowRoles("admin"), ctrl.deleteDiscount);

module.exports = router;
