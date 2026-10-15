// backend/routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const User = require("../models/User");

/* 🔧 Ortak mail transporter */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
});

/* ───────── REGISTER ───────── */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (await User.exists({ email }))
      return res.status(400).json({ error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(20).toString("hex");

    await User.create({
      username,
      email,
      password: hashedPassword,
      verificationToken,
      verificationTokenExpires: Date.now() + 15 * 60 * 1000, // ✅ 15 dk
      emailVerified: false,
    });

    /* doğrulama maili */
    const verifyLink = `${process.env.CLIENT_DOMAIN}/verify-email/${verificationToken}`;
    await transporter.sendMail({
      from: `"Site Adı" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "E-posta Doğrulama",
      html: `
        <h2>Merhaba ${username},</h2>
        <p>Hesabınızı doğrulamak için aşağıdaki bağlantıya tıklayın (15 dk geçerli):</p>
        <a href="${verifyLink}">${verifyLink}</a>`,
    });

    res.status(201).json({ message: "Kayıt başarılı. E-posta gönderildi." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

/* ───────── E-posta doğrulama ───────── */
router.get("/verify/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      verificationToken: req.params.token,
      verificationTokenExpires: { $gt: Date.now() }, // ✅ süre kontrolü
    });

    if (!user)
      return res.status(400).send("Geçersiz veya süresi dolmuş bağlantı");

    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).send("Doğrulama hatası");
  }
});

/* ───────── RESEND VERIFICATION ───────── */
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
    if (user.emailVerified)
      return res.status(400).json({ error: "E-posta zaten doğrulanmış" });

    /* yeni token */
    const verificationToken = crypto.randomBytes(20).toString("hex");
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const verifyLink = `${process.env.CLIENT_DOMAIN}/verify-email/${verificationToken}`;
    await transporter.sendMail({
      from: `"Site Adı" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: "E-posta Doğrulama (Yeniden)",
      html: `
        <p>Merhaba ${user.username},</p>
        <p>Aşağıdaki bağlantıya tıklayarak e-postanızı doğrulayabilirsiniz (15 dk geçerli):</p>
        <a href="${verifyLink}">${verifyLink}</a>`,
    });

    res.json({ message: "Doğrulama e-postası tekrar gönderildi." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

/* ───────── LOGIN ───────── */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid email" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid password" });

    /* JWT üret (15 dk) */
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        emailVerified: user.emailVerified,
        avatar: user.avatar?.data
          ? `data:${user.avatar.contentType};base64,${user.avatar.data.toString(
              "base64"
            )}`
          : null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
});

/* ───────── Şifre sıfırlama ───────── */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "E-posta bulunamadı." });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 dk
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
    });

    const resetLink = `${process.env.CLIENT_DOMAIN}/reset-password/${token}`;
    await transporter.sendMail({
      from: `"Site Adı" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: "Şifre Sıfırlama",
      html: `<p>Şifre sıfırlamak için:</p><a href="${resetLink}">${resetLink}</a>`,
    });

    res.json({ message: "Şifre sıfırlama bağlantısı gönderildi." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

/* ───────── Yeni şifre ───────── */
router.post("/reset-password/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ error: "Token geçersiz" });

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Şifre güncellendi." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

module.exports = router;
