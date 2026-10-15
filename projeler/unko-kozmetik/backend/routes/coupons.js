const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon.js");
const authMiddleware = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/requireAdmin");
const { findCoupon } = require("../utils/pricing");
const { HttpError, asyncHandler, exactMatch } = require("../utils/http");

const parseCoupon = (body) => {
  const code =
    typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const discountPercent = Number(body.discountPercent);
  if (!code) throw new HttpError(400, "Kupon kodu zorunludur.");
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
    throw new HttpError(
      400,
      "Kupon kodu 3-30 karakter olmalı; harf, rakam, - ve _ içerebilir."
    );
  }
  if (
    !Number.isFinite(discountPercent) ||
    discountPercent < 1 ||
    discountPercent > 100
  ) {
    throw new HttpError(400, "İndirim oranı 1 ile 100 arasında olmalıdır.");
  }
  return { code, discountPercent };
};

const ensureUniqueCode = async (code, exceptId) => {
  const existing = await Coupon.findOne({ code: exactMatch(code) });
  if (existing && String(existing._id) !== String(exceptId)) {
    throw new HttpError(409, "Bu kupon kodu zaten mevcut.");
  }
};

// Kuponu Kod ile Getirme (sepette kullanılır, herkese açık)
router.get(
  "/code/:couponCode",
  asyncHandler(async (req, res) => {
    const coupon = await findCoupon(req.params.couponCode);
    if (!coupon) throw new HttpError(404, "Kupon bulunamadı.");
    res.status(200).json({
      success: true,
      data: { code: coupon.code, discountPercent: coupon.discountPercent },
      message: "Kupon başarıyla getirildi.",
    });
  })
);

// Aşağıdaki işlemler sadece admin içindir
router.use(authMiddleware, requireAdmin);

// Yeni Kupon Oluşturma
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseCoupon(req.body);
    await ensureUniqueCode(data.code);
    const newCoupon = await Coupon.create(data);
    res.status(201).json({
      success: true,
      data: newCoupon,
      message: "Kupon başarıyla oluşturuldu.",
    });
  })
);

// Tüm Kuponları Getirme
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: coupons,
      message: "Kuponlar başarıyla getirildi.",
    });
  })
);

// Kuponu ID ile Getirme
router.get(
  "/:couponId",
  asyncHandler(async (req, res) => {
    const coupon = await Coupon.findById(req.params.couponId);
    if (!coupon) throw new HttpError(404, "Kupon bulunamadı.");
    res.status(200).json({
      success: true,
      data: coupon,
      message: "Kupon başarıyla getirildi.",
    });
  })
);

// Kupon Güncelleme
router.put(
  "/:couponId",
  asyncHandler(async (req, res) => {
    const { couponId } = req.params;
    const data = parseCoupon(req.body);
    await ensureUniqueCode(data.code, couponId);

    const updatedCoupon = await Coupon.findByIdAndUpdate(couponId, data, {
      new: true,
      runValidators: true,
    });
    if (!updatedCoupon) throw new HttpError(404, "Kupon bulunamadı.");

    res.status(200).json({
      success: true,
      data: updatedCoupon,
      message: "Kupon başarıyla güncellendi.",
    });
  })
);

// Kupon Silme
router.delete(
  "/:couponId",
  asyncHandler(async (req, res) => {
    const deletedCoupon = await Coupon.findByIdAndDelete(req.params.couponId);
    if (!deletedCoupon) throw new HttpError(404, "Kupon bulunamadı.");
    res.status(200).json({
      success: true,
      message: "Kupon başarıyla silindi.",
    });
  })
);

module.exports = router;
