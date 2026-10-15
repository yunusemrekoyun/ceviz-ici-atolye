const express = require("express");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const controller = require("../controllers/mediaController");
const maintenanceController = require("../controllers/mediaMaintenanceController");
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const { mediaError, toMediaErrorPayload } = require("../services/media/errors");

const router = express.Router();

const mutationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.method === "OPTIONS" || req.method === "HEAD" || req.method === "GET",
  keyGenerator: (req) => req.user?.userId || ipKeyGenerator(req.ip),
  handler: (req, res) => {
    const error = mediaError("MEDIA_RATE_LIMITED", 429, { retryAfter: 60 });
    res.status(429).json(toMediaErrorPayload(error, req.requestId));
  },
});

router.use(verifyToken);
router.use(mutationLimiter);

router.get("/policies", controller.getPolicies);
router.get(
  "/maintenance/summary",
  allowRoles("admin"),
  maintenanceController.summary
);
router.get(
  "/maintenance/assets",
  allowRoles("admin"),
  maintenanceController.list
);
router.get(
  "/maintenance/reconciliation",
  allowRoles("admin"),
  maintenanceController.reconcile
);
router.post(
  "/maintenance/reconciliation",
  allowRoles("admin"),
  maintenanceController.reconcile
);
router.delete(
  "/maintenance/assets/:id",
  allowRoles("admin"),
  maintenanceController.trash
);
router.post(
  "/maintenance/assets/:id/restore",
  allowRoles("admin"),
  maintenanceController.restore
);
router.delete(
  "/maintenance/assets/:id/purge",
  allowRoles("admin"),
  maintenanceController.purge
);
router.post("/uploads", controller.createUpload);
router.get("/uploads/:id", controller.getUpload);
router.patch("/uploads/:id", controller.appendUploadChunk);
router.delete("/uploads/:id", controller.cancelUpload);
router.get("/assets/:id", controller.getAsset);
router.post("/assets/:id/retry", controller.retryAsset);

module.exports = router;
