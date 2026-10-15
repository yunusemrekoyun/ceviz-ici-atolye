const express = require("express");
const router = express.Router();
const Address = require("../models/Address");
const User = require("../models/User");
const authMiddleware = require("../middlewares/authMiddleware");
const { HttpError, asyncHandler } = require("../utils/http");

router.use(authMiddleware);

const parseAddress = (body) => {
  const pick = (key) => (typeof body[key] === "string" ? body[key].trim() : "");
  const data = {
    name: pick("name"),
    phone: pick("phone"),
    address: pick("address"),
    city: pick("city"),
    district: pick("district"),
  };
  if (!data.name) throw new HttpError(400, "Ad soyad zorunludur.");
  if (data.phone.replace(/\D/g, "").length < 10) {
    throw new HttpError(400, "Geçerli bir telefon numarası girin.");
  }
  if (!data.address) throw new HttpError(400, "Adres zorunludur.");
  if (!data.city) throw new HttpError(400, "Şehir zorunludur.");
  return data;
};

const getUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, "Kullanıcı bulunamadı.");
  return user;
};

// Adres Ekleme
router.post(
  "/add",
  asyncHandler(async (req, res) => {
    const data = parseAddress(req.body);
    const user = await getUser(req.user.id);

    const newAddress = await Address.create({
      ...data,
      email: user.email,
      userId: user._id,
    });

    res.status(201).json({
      success: true,
      data: newAddress,
      message: "Adres başarıyla eklendi.",
    });
  })
);

// Kullanıcının adreslerini görüntüleme
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const addresses = await Address.find({ userId: req.user.id }).sort({
      createdAt: 1,
    });
    res.status(200).json({
      success: true,
      data: addresses,
      message: "Adresler başarıyla getirildi.",
    });
  })
);

// Adres Güncelleme
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = parseAddress(req.body);
    const user = await getUser(req.user.id);

    const updated = await Address.findOneAndUpdate(
      { _id: req.params.id, userId: user._id },
      { ...data, email: user.email },
      { new: true }
    );
    if (!updated) throw new HttpError(404, "Adres bulunamadı.");

    res.status(200).json({
      success: true,
      data: updated,
      message: "Adres başarıyla güncellendi.",
    });
  })
);

module.exports = router;
