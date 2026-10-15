const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const controller = require("../controllers/legalDocumentController");

router.get("/", controller.getPublic);
router.get("/admin", verifyToken, allowRoles("admin"), controller.getAdmin);
router.get("/admin/:key/:version", verifyToken, allowRoles("admin"), controller.getVersion);
router.post("/admin/:key", verifyToken, allowRoles("admin"), controller.publish);

module.exports = router;
