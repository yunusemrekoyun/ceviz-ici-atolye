/********************************************************
 * backend/routes/orders.js
 * Siparişler ödeme akışında oluşturulur (bkz. routes/payment.js).
 ********************************************************/
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/requireAdmin");
const Order = require("../models/Order");
const { HttpError, asyncHandler } = require("../utils/http");

router.use(authMiddleware);

// Kullanıcı kendi siparişlerini görür
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const orders = await Order.find({
      userId: req.user.id,
      ...Order.PAID_FILTER,
    }).sort({
      createdAt: -1,
    });
    res.status(200).json({
      success: true,
      data: orders,
      message: "Siparişler başarıyla getirildi.",
    });
  })
);

// Admin tüm siparişleri görür
router.get(
  "/all",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const orders = await Order.find(Order.PAID_FILTER).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: orders,
      message: "Tüm siparişler başarıyla getirildi.",
    });
  })
);

// Admin sipariş durumu güncelleme
router.put(
  "/:orderId",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    if (!Order.STATUSES.includes(status)) {
      throw new HttpError(400, "Geçersiz sipariş durumu.");
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: req.params.orderId, ...Order.PAID_FILTER },
      { status },
      { new: true }
    );
    if (!updatedOrder) throw new HttpError(404, "Sipariş bulunamadı.");

    res.status(200).json({
      success: true,
      data: updatedOrder,
      message: "Sipariş durumu başarıyla güncellendi.",
    });
  })
);

module.exports = router;
