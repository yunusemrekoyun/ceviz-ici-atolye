/********************************************************
 * backend/middlewares/authMiddleware.js
 ********************************************************/
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config");
const blacklistedTokens = require("../utils/blacklistedTokens");

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <ACCESS_TOKEN>

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "Bu işlem için giriş yapmalısınız." });
  }

  if (blacklistedTokens.has(token)) {
    return res.status(401).json({
      success: false,
      message: "Oturumunuz sonlandırılmış. Lütfen tekrar giriş yapın.",
    });
  }

  try {
    req.user = jwt.verify(token, jwtSecret);
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Oturum süreniz doldu. Lütfen tekrar giriş yapın.",
    });
  }
};

module.exports = authMiddleware;
