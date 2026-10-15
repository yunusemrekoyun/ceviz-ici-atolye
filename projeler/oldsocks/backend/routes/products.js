// src/routes/productRoutes.js

const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const productCtrl = require("../controllers/productController");

// Public
router.get("/", productCtrl.getProducts);
router.get("/:id", productCtrl.getProduct);

// Admin-only
router.post(
  "/",
  verifyToken,
  allowRoles("admin"),
  productCtrl.createProduct
);

router.put(
  "/:id",
  verifyToken,
  allowRoles("admin"),
  productCtrl.updateProduct
);

router.delete(
  "/:id",
  verifyToken,
  allowRoles("admin"),
  productCtrl.deleteProduct
);

// ✅ Yeni renk ekleme (admin-only)
router.post(
  "/new-color/:baseProductId",
  verifyToken,
  allowRoles("admin"),
  productCtrl.createProductWithNewColor
);

module.exports = router;
