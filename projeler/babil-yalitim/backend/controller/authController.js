// backend/controller/authController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS_HASH = process.env.ADMIN_PASS_HASH;
const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES_IN =
  process.env.ACCESS_TOKEN_EXPIRES_IN?.trim() || "1h";

// cookie için ortak ayarlar (Railway + Vercel farklı domainlerdeyse SameSite=None + Secure şart)
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined; // örn: .senindomainin.com
const CROSS_SITE = process.env.CROSS_SITE_COOKIES === "1"; // farklı domainse 1 yap
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: CROSS_SITE ? true : process.env.NODE_ENV === "production",
  sameSite: CROSS_SITE ? "none" : "lax",
  path: "/",
  domain: COOKIE_DOMAIN, // genelde boş bırakılır; çoklu subdomain varsa ayarla
};

async function verifyPassword(plain, hashEnv) {
  if (!hashEnv?.trim()) return false;
  try {
    return await bcrypt.compare(plain, hashEnv.trim());
  } catch {
    return false;
  }
}

function getConfigError() {
  if (!ADMIN_USER || !JWT_SECRET || !ADMIN_PASS_HASH?.trim()) {
    return "Sunucu yapılandırma hatası: ADMIN_USER, ADMIN_PASS_HASH ve JWT_SECRET tanımlı olmalı.";
  }
  return false;
}

function issueTokens(username) {
  const accessToken = jwt.sign({ username, role: "admin" }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
  const csrfToken = crypto.randomBytes(24).toString("hex");
  const payload = jwt.decode(accessToken);
  const exp = payload?.exp || null;
  return { accessToken, csrfToken, exp };
}

exports.login = async (req, res) => {
  try {
    const configError = getConfigError();
    if (configError) {
      return res.status(500).json({
        message: configError,
      });
    }

    const { username = "", password = "" } = req.body || {};
    if (username !== ADMIN_USER) {
      return res
        .status(401)
        .json({ message: "Kullanıcı adı veya şifre hatalı" });
    }

    const ok = await verifyPassword(password, ADMIN_PASS_HASH);
    if (!ok) {
      return res
        .status(401)
        .json({ message: "Kullanıcı adı veya şifre hatalı" });
    }

    // JWT + CSRF üret
    const { accessToken, csrfToken, exp } = issueTokens(username);

    // JWT -> httpOnly cookie
    res.cookie("accessToken", accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 1000 * 60 * 60 * 12, // 12 saat cookie ömrü (JWT exp ayrı)
    });

    // CSRF -> normal cookie (JS okuyabilir); header ile eşleşecek
    res.cookie("csrfToken", csrfToken, {
      // httpOnly: false default (JS erişsin)
      secure: COOKIE_OPTIONS.secure,
      sameSite: COOKIE_OPTIONS.sameSite,
      path: "/",
      domain: COOKIE_OPTIONS.domain,
      maxAge: 1000 * 60 * 60 * 12,
    });

    // Body’de csrfToken + exp dönüyoruz (token dönmüyoruz)
    return res.json({ csrfToken, exp });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Giriş işlemi başarısız" });
  }
};

exports.me = async (req, res) => {
  // verifyToken geçmişse req.user dolu olur
  return res.json({ user: req.user || null, exp: req.user?.exp || null });
};

exports.logout = async (req, res) => {
  // Cookie’leri sil
  res.clearCookie("accessToken", {
    ...COOKIE_OPTIONS,
  });
  res.clearCookie("csrfToken", {
    secure: COOKIE_OPTIONS.secure,
    sameSite: COOKIE_OPTIONS.sameSite,
    path: "/",
    domain: COOKIE_OPTIONS.domain,
  });
  return res.json({ ok: true });
};

exports.refresh = async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(401).json({ message: "Kimlik doğrulaması gerekiyor" });
    }

    const { accessToken, csrfToken, exp } = issueTokens(username);

    res.cookie("accessToken", accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 1000 * 60 * 60 * 12,
    });

    res.cookie("csrfToken", csrfToken, {
      secure: COOKIE_OPTIONS.secure,
      sameSite: COOKIE_OPTIONS.sameSite,
      path: "/",
      domain: COOKIE_OPTIONS.domain,
      maxAge: 1000 * 60 * 60 * 12,
    });

    return res.json({ csrfToken, exp });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Oturum yenileme başarısız" });
  }
};
