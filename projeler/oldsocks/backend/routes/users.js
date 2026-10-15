// backend/routes/users.js
const router = require("express").Router();
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { verifyToken } = require("../middleware/auth");
const { allowRoles } = require("../middleware/roles");
const {
  getMe,
  updateMe,
  changePassword,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  deleteMe,
} = require("../controllers/userController");

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

// — Normal user endpoints —
router.get("/me", verifyToken, getMe); // GET    /api/v1/users/me
router.put("/me", verifyToken, updateMe); // PUT    /api/v1/users/me
router.post("/me/password", verifyToken, changePasswordLimiter, changePassword);
router.delete("/me", verifyToken, changePasswordLimiter, deleteMe); // DELETE /api/v1/users/me

// — Address management for logged-in user —
router.get("/me/addresses", verifyToken, getAddresses); // GET    /api/v1/users/me/addresses
router.post("/me/addresses", verifyToken, addAddress); // POST   /api/v1/users/me/addresses
router.put("/me/addresses/:addrId", verifyToken, updateAddress); // PUT    /api/v1/users/me/addresses/:addrId
router.delete("/me/addresses/:addrId", verifyToken, deleteAddress); // DELETE /api/v1/users/me/addresses/:addrId

// — Admin-only endpoints —
router.get("/", verifyToken, allowRoles("admin"), getAllUsers); // GET    /api/v1/users
router.get("/:id", verifyToken, allowRoles("admin"), getUserById); // GET    /api/v1/users/:id
router.put("/:id", verifyToken, allowRoles("admin"), updateUser); // PUT    /api/v1/users/:id
router.delete("/:id", verifyToken, allowRoles("admin"), deleteUser); // DELETE /api/v1/users/:id

module.exports = router;
