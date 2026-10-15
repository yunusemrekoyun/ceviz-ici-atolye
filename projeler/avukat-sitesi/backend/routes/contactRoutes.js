// routes/contactRoutes.js
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { contactController } from "../controller/contactController.js";

const r = Router();

// Basit rate limit: IP başına 10dk/20 istek
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

r.post("/", limiter, contactController.send);

export default r;
