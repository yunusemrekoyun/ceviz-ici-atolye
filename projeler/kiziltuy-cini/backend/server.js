require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const logger = require("morgan");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const mainRoute = require("./routes/index.js");
const {
  conditionalLimiter,
  enableLimiter,
  disableLimiter,
  getLimiterStatus,
} = require("./middleware/rateLimiter");

const app = express();
dotenv.config();
const port = 5000;

// Orijinal IP'yi almak için (Vercel, Nginx gibi proxy'lerde)
app.set("trust proxy", 1);

// CORS ve logging
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://mern-product-showroom-project-asdf.vercel.app",
    ],
    credentials: true,
  })
);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(logger("dev"));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));
app.use(mongoSanitize());
app.use(require("xss-clean")());

// Rate limiter middleware
app.use(conditionalLimiter);

// DB Bağlantısı
const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connection successful");
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
};

// Limiter kontrol formu GET / POST
app.get("/api/limiter/off", (req, res) => {
  res.send(`
    <form method="POST" action="/api/limiter/off">
      <label>Limiter'ı kapatmak için şifre girin:</label>
      <input type="password" name="secret" required />
      <button type="submit">Gönder</button>
    </form>
  `);
});

app.post("/api/limiter/off", (req, res) => {
  const { secret } = req.body;
  if (secret !== process.env.LIMITER_SECRET) {
    return res
      .status(403)
      .send("<h3>Hatalı şifre. <a href='/api/limiter/off'>Geri dön</a></h3>");
  }
  disableLimiter();
  res.send(
    "<h3>Limiter kapatıldı. <a href='/api/limiter/status'>Durumu Gör</a></h3>"
  );
});

app.get("/api/limiter/on", (req, res) => {
  res.send(`
    <form method="POST" action="/api/limiter/on">
      <label>Limiter'ı açmak için şifre girin:</label>
      <input type="password" name="secret" required />
      <button type="submit">Gönder</button>
    </form>
  `);
});

app.post("/api/limiter/on", (req, res) => {
  const { secret } = req.body;
  if (secret !== process.env.LIMITER_SECRET) {
    return res
      .status(403)
      .send("<h3>Hatalı şifre. <a href='/api/limiter/on'>Geri dön</a></h3>");
  }
  enableLimiter();
  res.send(
    "<h3>Limiter açıldı. <a href='/api/limiter/status'>Durumu Gör</a></h3>"
  );
});

app.get("/api/limiter/status", (req, res) => {
  res.json({ enabled: getLimiterStatus() });
});

// Ana route
app.use("/api", mainRoute);

// Server start
app.listen(port, () => {
  connect();
  console.log(`Sunucu ${port} portunda çalışıyor.`);
});
app.use((err, req, res, next) => {
  console.error(err); // log dosyasına da aktarabilirsin
  res.status(500).json({ error: "Sunucu hatası" });
});
