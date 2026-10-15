const router = require("express").Router();
const { subscribe, list } = require("../controllers/newsletterController");
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { requireHuman } = require("../services/turnstile");

// public: abone ol
router.post("/subscribe", requireHuman(), subscribe);

// admin: listele (opsiyonel)
router.get("/", verifyToken, allowRoles("admin"), list);

module.exports = router;
