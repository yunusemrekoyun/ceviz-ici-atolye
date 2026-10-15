/********************************************************
 * backend/routes/auth.js
 ********************************************************/
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User.js");
const authMiddleware = require("../middlewares/authMiddleware");
const blacklistedTokens = require("../utils/blacklistedTokens");
const { jwtSecret, refreshSecret } = require("../config");
const { HttpError, asyncHandler, EMAIL_REGEX } = require("../utils/http");

const MIN_PASSWORD_LENGTH = 6;

const signAccessToken = (user) =>
  jwt.sign({ id: user._id, email: user.email, role: user.role }, jwtSecret, {
    expiresIn: "15m",
  });

const signRefreshToken = (user) =>
  jwt.sign({ id: user._id, email: user.email }, refreshSecret, {
    expiresIn: "7d",
  });

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const validatePassword = (password) => {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(
      400,
      `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır.`
    );
  }
};

const publicUser = (user) => ({
  id: user._id,
  email: user.email,
  username: user.username,
  role: user.role,
});

/********************************************************
 * POST /register
 ********************************************************/
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const username =
      typeof req.body.username === "string" ? req.body.username.trim() : "";
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    if (username.length < 2) {
      throw new HttpError(400, "Kullanıcı adı en az 2 karakter olmalıdır.");
    }
    if (!EMAIL_REGEX.test(email)) {
      throw new HttpError(400, "Geçerli bir e-posta adresi girin.");
    }
    validatePassword(password);

    if (await User.exists({ email })) {
      throw new HttpError(409, "Bu e-posta adresi zaten kayıtlı.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ username, email, password: hashedPassword });

    res.status(201).json({ success: true, message: "Kayıt başarılı." });
  })
);

/********************************************************
 * POST /login
 ********************************************************/
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    const user = email ? await User.findOne({ email }) : null;
    const isValid =
      user && typeof password === "string"
        ? await bcrypt.compare(password, user.password)
        : false;

    if (!isValid) {
      throw new HttpError(401, "E-posta veya şifre hatalı.");
    }

    res.status(200).json({
      success: true,
      message: "Giriş başarılı.",
      token: signAccessToken(user),
      refreshToken: signRefreshToken(user),
      role: user.role,
    });
  })
);

/********************************************************
 * POST /refresh
 ********************************************************/
router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken, oldAccessToken } = req.body;

    if (!refreshToken) {
      throw new HttpError(400, "Refresh token eksik.");
    }
    if (blacklistedTokens.has(refreshToken)) {
      throw new HttpError(
        401,
        "Oturumunuz sonlandırılmış. Lütfen tekrar giriş yapın."
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, refreshSecret);
    } catch {
      throw new HttpError(
        401,
        "Oturum süreniz doldu. Lütfen tekrar giriş yapın."
      );
    }

    // Rol değişmiş olabilir; kullanıcı her seferinde veritabanından okunur
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new HttpError(401, "Kullanıcı bulunamadı.");
    }

    if (oldAccessToken) blacklistedTokens.add(oldAccessToken);

    res.status(200).json({
      success: true,
      message: "Access token yenilendi.",
      token: signAccessToken(user),
      role: user.role,
    });
  })
);

/********************************************************
 * POST /logout
 ********************************************************/
router.post("/logout", authMiddleware, (req, res) => {
  blacklistedTokens.add(req.headers.authorization?.split(" ")[1]);
  if (typeof req.body?.refreshToken === "string") {
    blacklistedTokens.add(req.body.refreshToken);
  }
  res.status(200).json({ success: true, message: "Çıkış yapıldı." });
});

/********************************************************
 * GET /me
 ********************************************************/
router.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) throw new HttpError(404, "Kullanıcı bulunamadı.");
    res.status(200).json(publicUser(user));
  })
);

/********************************************************
 * PUT /me  — Body: { username }
 ********************************************************/
router.put(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const username =
      typeof req.body.username === "string" ? req.body.username.trim() : "";
    if (username.length < 2) {
      throw new HttpError(400, "Kullanıcı adı en az 2 karakter olmalıdır.");
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { username },
      { new: true }
    ).select("-password");
    if (!user) throw new HttpError(404, "Kullanıcı bulunamadı.");
    res.status(200).json({
      success: true,
      data: publicUser(user),
      message: "Profiliniz güncellendi.",
    });
  })
);

/********************************************************
 * PUT /change-password
 * Body: { oldPassword, newPassword, confirmPassword }
 ********************************************************/
router.put(
  "/change-password",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (!oldPassword || !newPassword || !confirmPassword) {
      throw new HttpError(400, "Tüm şifre alanları zorunludur.");
    }
    if (newPassword !== confirmPassword) {
      throw new HttpError(400, "Yeni şifreler eşleşmiyor.");
    }
    validatePassword(newPassword);

    const user = await User.findById(req.user.id);
    if (!user) throw new HttpError(404, "Kullanıcı bulunamadı.");

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw new HttpError(400, "Mevcut şifreniz hatalı.");

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ success: true, message: "Şifreniz güncellendi." });
  })
);

module.exports = router;
