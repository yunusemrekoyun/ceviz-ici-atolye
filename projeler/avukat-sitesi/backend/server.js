// server.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { verifyMailer } from "./config/mailer.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { initCloudinary } from "./config/cloudinary.js";
import api from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

async function bootstrap() {
  const app = express();

  // ---- Config ----
  const PORT = env.PORT;
  const ORIGINS = env.ORIGINS;

  await connectDB(env.MONGODB_URI);
  initCloudinary(env.CLOUDINARY);

  if (env.NODE_ENV === "production") await verifyMailer();

  // ---- Middlewares ----
  app.set("trust proxy", 1);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      // Eğer ileride CSP istersek Cloudinary ve kendi domainlerinizi beyazlisteriz.
      // contentSecurityPolicy: false,
    })
  );
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true); // curl / same-origin
        const ok = ORIGINS.some((o) => origin === o);
        return ok ? cb(null, true) : cb(new Error("CORS blocked"), false);
      },
      credentials: true,
    })
  );
  app.use(compression());
  app.use(
    morgan(env.NODE_ENV === "production" ? "combined" : "dev", {
      skip: (req) => req.path === "/api/health",
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 120,
    })
  );

  // ---- Routes ----
  app.use("/api", api);

  // ---- Errors ----
  app.use(notFound);
  app.use(errorHandler);

  // ---- Start ----
  app.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
    console.log(`↪︎ CORS allowlist: ${ORIGINS.join(", ")}`);
  });
}

bootstrap().catch((err) => {
  console.error("❌ Bootstrap failed:", err);
  process.exit(1);
});
