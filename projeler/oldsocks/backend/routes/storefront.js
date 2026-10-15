const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const ctrl = require("../controllers/storefrontController");

router.get("/", ctrl.getPublic);
router.get("/home-products", ctrl.getHomeProducts);
router.get("/admin", verifyToken, allowRoles("admin"), ctrl.getAdmin);
router.put("/admin", verifyToken, allowRoles("admin"), ctrl.update);

module.exports = router;
