const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const PasswordResetToken = require("../models/PasswordResetToken");
const { sendAccountNoticeMail, sendPasswordResetMail } = require("../utils/mailer");
const loginThrottle = require("../utils/loginThrottle");

// Var olmayan hesapta da bcrypt çalışsın: yanıt süresi hesabın varlığını ele vermesin.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("oldsocks-olmayan-hesap", 10);
const {
  COOKIE_OPTIONS,
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
} = require("../utils/authTokens");
const { validatePasswordPolicy } = require("../utils/passwordPolicy");
const {
  createPasswordResetToken,
  getPasswordResetExpiryDate,
  hashPasswordResetToken,
} = require("../utils/passwordReset");
const { createWindowBudget } = require("../utils/windowBudget");
const resetMailBudget = createWindowBudget({ max: 3, windowMs: 60 * 60 * 1000 });
const {
  hasFilledHoneypot,
  isValidEmailAddress,
  normalizeEmailAddress,
} = require("../utils/email");

const GENERIC_RESET_RESPONSE = {
  message:
    "Eğer bu e-posta ile kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı gönderildi.",
};

function getPrimaryFrontendOrigin() {
  return (
    String(process.env.FRONTEND_ORIGIN || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)[0] || "http://localhost:5173"
  );
}

function validatePasswordInput(password) {
  const result = validatePasswordPolicy(password);
  if (!result.ok) {
    const err = new Error(result.message || "Şifre kuralları sağlanmıyor.");
    err.statusCode = 400;
    throw err;
  }
}

function sanitizeEmailOrThrow(email) {
  const normalizedEmail = normalizeEmailAddress(email);
  if (!isValidEmailAddress(normalizedEmail)) {
    const err = new Error("Geçerli bir e-posta girin.");
    err.statusCode = 400;
    throw err;
  }
  return normalizedEmail;
}

function sanitizeNameOrThrow(value, label) {
  const normalized = String(value || "").trim();
  if (normalized.length < 2 || normalized.length > 80) {
    const err = new Error(`${label} 2 ile 80 karakter arasında olmalıdır.`);
    err.statusCode = 400;
    throw err;
  }
  return normalized;
}

function sanitizePhoneOrThrow(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return undefined;
  if (!/^\+[1-9]\d{9,14}$/.test(normalized)) {
    const err = new Error("Geçerli bir telefon numarası girin.");
    err.statusCode = 400;
    throw err;
  }
  return normalized;
}

async function invalidateSessions(user) {
  user.refreshTokens = [];
  user.tokenVersion = Number(user.tokenVersion || 0) + 1;
  await user.save();
}

exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      role,
      website,
    } = req.body;

    // Bot tuzağı dolu: hesap açma, başarılı gibi yanıt ver.
    if (hasFilledHoneypot(website)) {
      return res.status(201).json({ message: "Kayıt başarılı." });
    }

    const normalizedEmail = sanitizeEmailOrThrow(email);
    const normalizedFirstName = sanitizeNameOrThrow(firstName, "Ad");
    const normalizedLastName = sanitizeNameOrThrow(lastName, "Soyad");
    const normalizedPhone = sanitizePhoneOrThrow(phone);
    validatePasswordInput(password);

    if (role && role !== "user") {
      console.warn("[Auth][Register] Role override attempt blocked.");
    }

    if (await User.findOne({ email: normalizedEmail })) {
      return res.status(400).json({ message: "E-posta zaten kullanımda." });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      email: normalizedEmail,
      password: hashed,
      phone: normalizedPhone,
      role: "user",
    });

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    user.refreshTokens = [
      ...user.refreshTokens,
      hashRefreshToken(refreshToken),
    ].slice(-10);
    await user.save();

    console.log(`[Auth][Register] Yeni kullanıcı: ${user._id}`);

    res
      .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
      .status(201)
      .json({ accessToken });
  } catch (err) {
    console.error("[Auth][Register] Hata:", err);
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Kayıt işlemi başarısız." });
  }
};

exports.login = async (req, res) => {
  try {
    const normalizedEmail = sanitizeEmailOrThrow(req.body?.email);
    const { password } = req.body;

    const waitMs = loginThrottle.remainingLockMs(normalizedEmail);
    if (waitMs) {
      const minutes = Math.max(1, Math.ceil(waitMs / 60000));
      res.set("Retry-After", String(Math.ceil(waitMs / 1000)));
      return res.status(429).json({
        message: `Çok fazla hatalı deneme. ${minutes} dakika sonra tekrar deneyin.`,
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+refreshTokens"
    );
    if (!user) {
      await bcrypt.compare(String(password || ""), DUMMY_PASSWORD_HASH);
      loginThrottle.recordFailure(normalizedEmail);
      return res.status(401).json({ message: "Geçersiz kimlik." });
    }

    const ok = await bcrypt.compare(String(password || ""), user.password);
    if (!ok) {
      loginThrottle.recordFailure(normalizedEmail);
      return res.status(401).json({ message: "Geçersiz kimlik." });
    }
    loginThrottle.recordSuccess(normalizedEmail);

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);
    user.refreshTokens = [
      ...user.refreshTokens,
      hashRefreshToken(refreshToken),
    ].slice(-10);
    await user.save();

    console.log(`[Auth][Login] Başarılı giriş: ${user._id}`);

    res
      .cookie("refreshToken", refreshToken, COOKIE_OPTIONS)
      .json({ accessToken });
  } catch (err) {
    console.error("[Auth][Login] Hata:", err);
    res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Giriş işlemi başarısız." });
  }
};

exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.status(401).json({ message: "Token yok." });
    }

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(payload.userId).select("+refreshTokens");
    if (!user) {
      res.clearCookie("refreshToken", COOKIE_OPTIONS);
      return res.status(403).json({ message: "Geçersiz token." });
    }

    const refreshTokenHash = hashRefreshToken(refreshToken);
    const stored = Array.isArray(user.refreshTokens)
      ? user.refreshTokens.includes(refreshToken) ||
        user.refreshTokens.includes(refreshTokenHash)
      : false;
    const payloadTokenVersion = Number(payload?.tokenVersion || 0);
    const currentTokenVersion = Number(user?.tokenVersion || 0);

    if (!stored || payloadTokenVersion !== currentTokenVersion) {
      user.refreshTokens = user.refreshTokens.filter(
        (token) => token !== refreshToken && token !== refreshTokenHash
      );
      await user.save();
      res.clearCookie("refreshToken", COOKIE_OPTIONS);
      return res.status(403).json({ message: "Geçersiz token." });
    }

    const newAccessToken = createAccessToken(user);
    const newRefreshToken = createRefreshToken(user);

    user.refreshTokens = user.refreshTokens
      .filter((token) => token !== refreshToken && token !== refreshTokenHash)
      .concat(hashRefreshToken(newRefreshToken))
      .slice(-10);
    await user.save();

    res
      .cookie("refreshToken", newRefreshToken, COOKIE_OPTIONS)
      .json({ accessToken: newAccessToken });
  } catch (err) {
    console.error("[Auth][Refresh] Token yenileme hatası:", err?.message || err);
    if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(err?.name)) {
      res.clearCookie("refreshToken", COOKIE_OPTIONS);
      return res.status(403).json({ message: "Token yenileme başarısız." });
    }
    // Geçici hata (ör. veritabanı): çerezi silme, istemci sonra tekrar dener.
    return res.status(503).json({ message: "Hizmet geçici olarak kullanılamıyor." });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;
    if (!refreshToken) {
      return res.clearCookie("refreshToken", COOKIE_OPTIONS).sendStatus(204);
    }

    const refreshTokenHash = hashRefreshToken(refreshToken);
    await User.updateOne(
      { refreshTokens: { $in: [refreshToken, refreshTokenHash] } },
      { $pull: { refreshTokens: { $in: [refreshToken, refreshTokenHash] } } }
    );

    res.clearCookie("refreshToken", COOKIE_OPTIONS).sendStatus(204);
  } catch (err) {
    console.error("[Auth][Logout] Hata:", err);
    res.status(500).json({ message: "Çıkış yapılamadı." });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const normalizedEmail = normalizeEmailAddress(req.body?.email);
    if (!isValidEmailAddress(normalizedEmail)) {
      return res.status(400).json({ message: "Geçerli bir e-posta girin." });
    }

    if (hasFilledHoneypot(req.body?.website)) {
      return res.json(GENERIC_RESET_RESPONSE);
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.json(GENERIC_RESET_RESPONSE);
    }

    // Aynı adrese saatte en fazla 3 sıfırlama e-postası: başkasının gelen kutusu
    // farklı IP'lerden doldurulamasın. Yanıt aynı kalır.
    if (!resetMailBudget.allow(normalizedEmail)) {
      return res.json(GENERIC_RESET_RESPONSE);
    }

    await PasswordResetToken.deleteMany({ user: user._id });

    const rawToken = createPasswordResetToken();
    const tokenHash = hashPasswordResetToken(rawToken);
    const expiresAt = getPasswordResetExpiryDate();

    await PasswordResetToken.create({
      user: user._id,
      tokenHash,
      expiresAt,
      requestIp: req.ip || null,
      userAgent: String(req.get("user-agent") || "").slice(0, 300) || null,
    });

    // Token URL'nin # kısmında: tarayıcı bunu sunucuya göndermez, erişim loglarına düşmez.
    const resetLink = `${getPrimaryFrontendOrigin()}/reset-password#token=${encodeURIComponent(
      rawToken
    )}`;

    try {
      await sendPasswordResetMail({
        user,
        resetLink,
        expiresAt,
      });
    } catch (mailError) {
      console.error("[Auth][ForgotPassword] Mail gönderimi başarısız:", mailError);
    }

    return res.json(GENERIC_RESET_RESPONSE);
  } catch (err) {
    console.error("[Auth][ForgotPassword] Hata:", err);
    return res.status(500).json(GENERIC_RESET_RESPONSE);
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const rawToken = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "");

    if (!rawToken) {
      return res.status(400).json({
        message: "Geçersiz veya eksik şifre sıfırlama bağlantısı.",
      });
    }

    validatePasswordInput(password);

    const tokenHash = hashPasswordResetToken(rawToken);
    const resetRecord = await PasswordResetToken.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      return res
        .status(400)
        .json({
          message: "Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.",
        });
    }

    const user = await User.findById(resetRecord.user);
    if (!user) {
      await PasswordResetToken.deleteOne({ _id: resetRecord._id });
      return res
        .status(400)
        .json({
          message: "Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.",
        });
    }

    const sameAsCurrent = await bcrypt.compare(password, user.password);
    if (sameAsCurrent) {
      return res
        .status(400)
        .json({ message: "Yeni şifre mevcut şifrenizle aynı olamaz." });
    }

    user.password = await bcrypt.hash(password, 10);
    await invalidateSessions(user);
    await PasswordResetToken.deleteMany({ user: user._id });
    sendAccountNoticeMail({
      to: user.email,
      subject: "Şifreniz sıfırlandı",
      lines: ["Hesabınızın şifresi, şifre sıfırlama bağlantısıyla değiştirildi.", "Tüm cihazlardaki oturumlarınız kapatıldı."],
    }).catch((error) => console.warn("[Auth][ResetPassword] Bildirim gönderilemedi:", error?.message || error));

    return res.json({
      message: "Şifreniz güncellendi. Giriş yapabilirsiniz.",
    });
  } catch (err) {
    console.error("[Auth][ResetPassword] Hata:", err);
    return res
      .status(err.statusCode || 500)
      .json({ message: err.message || "Şifre güncellenemedi." });
  }
};
