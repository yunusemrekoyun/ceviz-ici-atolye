// backend/controllers/userController.js
const mongoose = require("mongoose");
const User = require("../models/User");
const PasswordResetToken = require("../models/PasswordResetToken");
const bcrypt = require("bcrypt");
const { COOKIE_OPTIONS } = require("../utils/authTokens");
const { validatePasswordPolicy } = require("../utils/passwordPolicy");
const { sendAccountNoticeMail } = require("../utils/mailer");
const { deleteUserAccount } = require("../services/accountDeletion");
const {
  isValidEmailAddress,
  normalizeEmailAddress,
} = require("../utils/email");

const ADDRESS_FIELDS = [
  "title",
  "street",
  "mainaddress",
  "city",
  "district",
  "postalCode",
];
const ADDRESS_LIMITS = {
  title: 80,
  street: 180,
  mainaddress: 500,
  city: 100,
  district: 120,
  postalCode: 20,
};

function sanitizeAddress(body = {}) {
  const address = {};
  for (const field of ADDRESS_FIELDS) {
    address[field] = String(body?.[field] || "").trim();
    if (address[field].length > ADDRESS_LIMITS[field]) {
      return { error: "Adres alanlarından biri izin verilen uzunluğu aşıyor." };
    }
  }
  const missing = ["title", "street", "mainaddress", "city"].filter(
    (field) => !address[field]
  );
  if (missing.length) return { error: "Lütfen zorunlu adres alanlarını doldurun." };
  return { address };
}

// — Me endpoints —

// Profil bilgisi
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "-password -refreshTokens -tokenVersion"
    );
    if (!user)
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Profil alınırken hata oluştu." });
  }
};

// Profil güncelleme
exports.updateMe = async (req, res) => {
  try {
    const allowedFields = ["firstName", "lastName", "email", "phone"];

    const updates = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Güncellenecek alan bulunamadı." });
    }

    for (const field of ["firstName", "lastName"]) {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        updates[field] = String(updates[field] || "").trim();
        if (updates[field].length < 2 || updates[field].length > 80) {
          return res.status(400).json({
            message: `${field === "firstName" ? "Ad" : "Soyad"} 2 ile 80 karakter arasında olmalıdır.`,
          });
        }
      }
    }
    let previousEmail = null;
    if (Object.prototype.hasOwnProperty.call(updates, "email")) {
      updates.email = normalizeEmailAddress(updates.email);
      if (!isValidEmailAddress(updates.email) || updates.email.length > 100) {
        return res.status(400).json({ message: "Geçerli bir e-posta girin." });
      }
      // E-posta değişikliği hesabın kurtarma adresini değiştirir: mevcut parola şart.
      const current = await User.findById(req.user.userId).select("email password");
      if (!current) return res.status(404).json({ message: "Kullanıcı bulunamadı." });
      if (updates.email !== normalizeEmailAddress(current.email)) {
        const currentPassword = String(req.body?.currentPassword || "");
        if (!currentPassword || !(await bcrypt.compare(currentPassword, current.password))) {
          return res.status(400).json({ message: "E-posta adresini değiştirmek için mevcut şifrenizi girin." });
        }
        previousEmail = current.email;
      }
    }
    if (Object.prototype.hasOwnProperty.call(updates, "phone")) {
      updates.phone = String(updates.phone || "").trim();
      if (updates.phone && !/^\+[1-9]\d{9,14}$/.test(updates.phone)) {
        return res.status(400).json({ message: "Geçerli bir telefon numarası girin." });
      }
    }

    const user = await User.findByIdAndUpdate(req.user.userId, updates, {
      new: true,
      runValidators: true,
    }).select("-password -refreshTokens -tokenVersion");
    if (previousEmail) {
      sendAccountNoticeMail({
        to: previousEmail,
        subject: "E-posta adresiniz değiştirildi",
        lines: [`Hesabınızın e-posta adresi ${user.email} olarak değiştirildi.`],
      }).catch((error) => console.warn("[User][UpdateMe] Bildirim gönderilemedi:", error?.message || error));
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    if (err?.code === 11000) {
      return res.status(409).json({ message: "E-posta zaten kullanımda." });
    }
    res.status(500).json({ message: "Profil güncellenirken hata oluştu." });
  }
};

// — Address endpoints —

// Adres listesini getir
exports.getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("addresses");
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }
    res.json(user.addresses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Adresler alınırken hata oluştu." });
  }
};

// Yeni adres ekle
exports.addAddress = async (req, res) => {
  try {
    const normalized = sanitizeAddress(req.body);
    if (normalized.error) {
      return res.status(400).json({ message: normalized.error });
    }
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }
    if (user.addresses.length >= 20) {
      return res.status(409).json({
        message: "Bir hesapta en fazla 20 adres saklanabilir.",
      });
    }
    user.addresses.push(normalized.address);
    await user.save();
    res.status(201).json(user.addresses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Adres eklenirken hata oluştu." });
  }
};

// Var olan adresi güncelle
exports.updateAddress = async (req, res) => {
  try {
    const { addrId } = req.params;
    const normalized = sanitizeAddress(req.body);
    if (normalized.error) {
      return res.status(400).json({ message: normalized.error });
    }
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }
    const addr = user.addresses.id(addrId);
    if (!addr) return res.status(404).json({ message: "Adres bulunamadı." });
    Object.assign(addr, normalized.address);
    await user.save();
    res.json(addr);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Adres güncellenirken hata oluştu." });
  }
};

// Adresi sil
exports.deleteAddress = async (req, res) => {
  try {
    const { addrId } = req.params;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }
    const addr = user.addresses.id(addrId);
    if (!addr) return res.status(404).json({ message: "Adres bulunamadı." });

    user.addresses.pull({ _id: addrId }); // 🔧 BURASI DEĞİŞTİ
    await user.save();

    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Adres silinirken hata oluştu." });
  }
};

// — Admin endpoints —
// (Bunlar değişmedi; önceki haliyle kullanabilirsiniz)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -refreshTokens -tokenVersion");
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kullanıcılar alınırken hata oluştu." });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "-password -refreshTokens -tokenVersion"
    );
    if (!user)
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kullanıcı alınırken hata oluştu." });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const allowedFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "avatar",
      "role",
      "addresses",
      "password",
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Güncellenecek alan bulunamadı." });
    }

    let passwordChanged = false;
    const updateDoc = { $set: {} };

    if (updates.password) {
      const validation = validatePasswordPolicy(updates.password);
      if (!validation.ok) {
        return res.status(400).json({ message: validation.message });
      }
      updateDoc.$set.password = await bcrypt.hash(updates.password, 10);
      updateDoc.$set.refreshTokens = [];
      updateDoc.$inc = { tokenVersion: 1 };
      passwordChanged = true;
    }

    for (const [key, value] of Object.entries(updates)) {
      if (key === "password") continue;
      updateDoc.$set[key] = value;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateDoc, {
      new: true,
      runValidators: true,
    }).select("-password -refreshTokens -tokenVersion");
    if (!user)
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });

    if (passwordChanged) {
      await PasswordResetToken.deleteMany({ user: req.params.id });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Güncelleme sırasında hata oluştu." });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Geçersiz kullanıcı kimliği." });
    }
    // Yöneticinin kendini silmesi paneli yönetilemez bırakabilir.
    if (String(req.params.id) === String(req.user?.userId)) {
      return res.status(400).json({ message: "Kendi hesabınızı buradan silemezsiniz." });
    }
    const result = await deleteUserAccount(req.params.id);
    if (!result)
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    res.json({ message: "Kullanıcı silindi." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Silme sırasında hata oluştu." });
  }
};

// Müşterinin kendi hesabını silmesi (KVKK). Şifre ve açık onay gerekir.
exports.deleteMe = async (req, res) => {
  try {
    if (req.body?.confirm !== true) {
      return res.status(400).json({ message: "Hesabı silmek için onay kutusunu işaretleyin." });
    }
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    if (user.role === "admin") {
      return res.status(400).json({ message: "Yönetici hesabı bu ekrandan silinemez." });
    }
    const matches = await bcrypt.compare(String(req.body?.password || ""), user.password);
    if (!matches) return res.status(403).json({ message: "Şifre hatalı." });

    const email = user.email;
    await deleteUserAccount(user._id);
    res.clearCookie("refreshToken", COOKIE_OPTIONS);
    sendAccountNoticeMail({
      to: email,
      subject: "Hesabınız silindi",
      lines: [
        "OLDSOCKS hesabınız ve hesabınıza bağlı kişisel verileriniz silindi.",
        "Verdiğiniz siparişlerin kayıtları yasal saklama süresi boyunca tutulur.",
      ],
      footer: "Bu işlemi siz yapmadıysanız bize hemen yazın.",
    }).catch((error) => console.warn("[account-delete] bildirim gönderilemedi:", error?.message || error));
    res.json({ message: "Hesabınız silindi." });
  } catch (err) {
    console.error("deleteMe error:", err);
    res.status(500).json({ message: "Hesap silinemedi." });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Mevcut şifre ve yeni şifre zorunludur." });
    }

    const validation = validatePasswordPolicy(newPassword);
    if (!validation.ok) {
      return res.status(400).json({ message: validation.message });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı." });
    }

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return res.status(400).json({ message: "Mevcut şifre hatalı." });
    }

    const sameAsCurrent = await bcrypt.compare(newPassword, user.password);
    if (sameAsCurrent) {
      return res
        .status(400)
        .json({ message: "Yeni şifre mevcut şifrenizle aynı olamaz." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.refreshTokens = [];
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    await user.save();
    await PasswordResetToken.deleteMany({ user: user._id });
    sendAccountNoticeMail({
      to: user.email,
      subject: "Şifreniz değiştirildi",
      lines: ["Hesabınızın şifresi değiştirildi.", "Tüm cihazlardaki oturumlarınız kapatıldı."],
    }).catch((error) => console.warn("[User][ChangePassword] Bildirim gönderilemedi:", error?.message || error));

    return res
      .clearCookie("refreshToken", COOKIE_OPTIONS)
      .json({ message: "Şifreniz güncellendi. Lütfen tekrar giriş yapın." });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Şifre güncellenirken hata oluştu." });
  }
};
