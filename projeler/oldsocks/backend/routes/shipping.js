const router = require("express").Router();
const ctrl = require("../controllers/shippingController");
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");

// Public
router.get("/", ctrl.list);

// Admin
router.post("/", verifyToken, allowRoles("admin"), ctrl.create);
router.put("/:id", verifyToken, allowRoles("admin"), ctrl.update);
router.delete("/:id", verifyToken, allowRoles("admin"), ctrl.remove);

module.exports = router;
