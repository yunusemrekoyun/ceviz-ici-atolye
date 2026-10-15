const express = require("express");
const router = express.Router();

// Diğer rota dosyalarını içe aktarıyoruz
const categoryRoute = require("./categories.js");
const authRoute = require("./auth.js");
const productRoute = require("./products.js");
const couponRoute = require("./coupons.js");
const userRoute = require("./users.js");
const paymentRoute = require("./payment.js");
const campaignRoute = require("./campaign.js");
const blogRoute = require("./blogs.js");
const productReviewsRoute = require("./product-reviews.js");
const visitRoute = require("./visits.js");
const productPriceRoute = require("./productPrice");

// Her rotayı ilgili yol altında kullanıyoruz
router.use("/visits", visitRoute);
router.use("/blogs", blogRoute);
router.use("/product-reviews", productReviewsRoute);
router.use("/categories", categoryRoute);
router.use("/campaigns", campaignRoute);
router.use("/auth", authRoute);
router.use("/products", productRoute);
router.use("/coupons", couponRoute);
router.use("/users", userRoute);
router.use("/payment", paymentRoute);
router.use("/product-price", productPriceRoute);

module.exports = router;
