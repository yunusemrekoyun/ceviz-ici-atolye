import { Router } from "express";
import articleRoutes from "./articleRoutes.js";
import authRoutes from "./authRoutes.js";
import decisionRoutes from "./decisionRoutes.js";
import contactRoutes from "./contactRoutes.js";
const api = Router();

api.get("/health", (req, res) => res.json({ ok: true, ts: Date.now() }));

api.use("/auth", authRoutes); // -> /api/auth/*
api.use("/articles", articleRoutes); // -> /api/articles/*
api.use("/decisions", decisionRoutes);
api.use("/contact", contactRoutes);

export default api;
