// backend/routes/serviceRoutes.js
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
// const upload = require("../middleware/upload"); // eski (sadece image)
// ⇩ yeni: image+video kabul eder (disk veya memory çalışır)
const { upload, compressIfNeeded } = require("../middleware/uploadMedia");

const {
  getServices,
  getServiceById,
  getServiceTranslations,
  createService,
  updateService,
  updateServiceTranslations,
  deleteService,
  setServiceOrder,
} = require("../controller/serviceController");

// public
router.get("/", getServices);
router.get("/:id/translations", verifyToken, getServiceTranslations);
router.get("/:id", getServiceById);

// protected + multipart (image | video)
router.post(
  "/",
  verifyToken,
  upload.any(),
  compressIfNeeded,
  createService
);

router.put(
  "/:id",
  verifyToken,
  upload.any(),
  compressIfNeeded,
  updateService
);

router.patch("/:id/order", verifyToken, setServiceOrder);
router.put("/:id/translations", verifyToken, updateServiceTranslations);

router.delete("/:id", verifyToken, deleteService);

module.exports = router;
