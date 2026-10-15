const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const controller = require("../controllers/siteContentController");

router.get("/", controller.getPublic);
router.get("/admin", verifyToken, allowRoles("admin"), controller.getAdmin);
router.put("/admin", verifyToken, allowRoles("admin"), controller.update);

module.exports = router;
