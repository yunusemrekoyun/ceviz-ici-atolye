/********************************************************
 * backend/server.js
 ********************************************************/
const config = require("./config");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const logger = require("morgan");
const mainRoute = require("./routes/index.js");
const { webhookHandler } = require("./routes/payment.js");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.disable("x-powered-by");
// Production'da sadece CLIENT_DOMAIN adreslerine izin verilir
app.use(cors({ origin: config.isProduction ? config.clientDomains : true }));
app.use(logger(config.isProduction ? "combined" : "dev"));

// Stripe imzayı ham gövde üzerinden doğrular; JSON parser'dan önce gelmeli
app.post(
  "/api/payment/webhook",
  express.raw({ type: "application/json" }),
  webhookHandler
);

app.use(express.json({ limit: "1mb" }));

// Sağlık kontrolü
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ROUTES
app.use("/api", mainRoute);

// 404 Not Found Handler
app.all("*", (req, res, next) => {
  const error = new Error(`Bu istek yolu bulunamadı: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Global Error Handler
app.use(errorHandler);

// DATABASE CONNECTION AND SERVER START
const start = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("Veritabanı bağlantısı başarılı.");
  } catch (error) {
    console.error("Veritabanına bağlanılamadı:", error.message);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`Sunucu ${config.port} portunda çalışıyor.`);
  });
};

start();
