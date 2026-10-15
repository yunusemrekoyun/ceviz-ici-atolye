const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");
const controller = require("../controllers/userProfilePictureController");

router.get("/", verifyToken, controller.getMyProfilePicture);
router.post("/", verifyToken, controller.createOrUpdateProfilePicture);
router.delete("/", verifyToken, controller.deleteProfilePicture);

module.exports = router;
