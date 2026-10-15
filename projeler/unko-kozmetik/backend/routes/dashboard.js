/********************************************************
 * backend/routes/dashboard.js  (sadece admin)
 ********************************************************/
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const User = require("../models/User");
const authMiddleware = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/requireAdmin");
const { asyncHandler } = require("../utils/http");

const MONTHS = 6;

// Son N ayın "YYYY-MM" listesi, UTC (boş aylar grafikte 0 görünsün diye)
const lastMonths = (count) => {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - i), 1)
    );
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
};

const fillMonths = (rows, months) =>
  months.map((month) => ({
    month,
    count: rows.find((r) => r._id === month)?.count || 0,
  }));

router.get(
  "/",
  authMiddleware,
  requireAdmin,
  asyncHandler(async (req, res) => {
    // Ödemesi tamamlanmış ve iptal edilmemiş siparişler
    const validOrders = {
      ...Order.PAID_FILTER,
      status: { $ne: "İptal Edildi" },
    };

    const months = lastMonths(MONTHS);
    const since = new Date(`${months[0]}-01T00:00:00Z`);

    const [
      totalCustomers,
      salesAgg,
      revenueAgg,
      monthlySales,
      monthlyCustomers,
      totalOrders,
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),
      Order.aggregate([
        { $match: validOrders },
        { $unwind: "$items" },
        { $group: { _id: null, total: { $sum: "$items.quantity" } } },
      ]),
      Order.aggregate([
        { $match: validOrders },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Order.aggregate([
        { $match: { ...validOrders, createdAt: { $gte: since } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            count: { $sum: "$items.quantity" },
          },
        },
      ]),
      User.aggregate([
        { $match: { role: "user", createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),
      Order.countDocuments(validOrders),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalSales: salesAgg[0]?.total || 0,
        totalOrders,
        totalCustomers,
        totalRevenue: Math.round((revenueAgg[0]?.total || 0) * 100) / 100,
        monthlyProductSales: fillMonths(monthlySales, months),
        monthlyCustomerGrowth: fillMonths(monthlyCustomers, months),
      },
      message: "Dashboard verileri başarıyla getirildi.",
    });
  })
);

module.exports = router;
