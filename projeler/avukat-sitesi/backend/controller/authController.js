import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "access_token";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";
const SECURE = (process.env.AUTH_COOKIE_SECURE || "false") === "true";
const SAME_SITE = process.env.AUTH_COOKIE_SAME_SITE || "Lax";

function signToken(user) {
  return jwt.sign(
    { sub: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

function cookieOptions() {
  const oneHourMs = 3600 * 1000;
  return {
    httpOnly: true,
    secure: (process.env.AUTH_COOKIE_SECURE || "false") === "true",
    sameSite: process.env.AUTH_COOKIE_SAME_SITE || "Lax",
    path: "/",
    maxAge: oneHourMs,
  };
}

export const authController = {
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ error: "email and password required" });

      const exists = await User.findOne({ email });
      if (exists)
        return res.status(409).json({ error: "email already in use" });

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({
        name,
        email,
        passwordHash,
        role: "admin",
      });

      const token = signToken(user);
      res
        .cookie(COOKIE_NAME, token, cookieOptions())
        .status(201)
        .json({
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
          // token döndürmüyoruz artık; gerekirse ekleyebiliriz
        });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ error: "email and password required" });

      const user = await User.findOne({ email });
      if (!user) return res.status(401).json({ error: "invalid credentials" });

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return res.status(401).json({ error: "invalid credentials" });

      const token = signToken(user);
      res.cookie(COOKIE_NAME, token, cookieOptions()).json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async me(req, res) {
    res.json({ user: req.user });
  },

  async logout(req, res) {
    const opts = cookieOptions();
    res.clearCookie(process.env.AUTH_COOKIE_NAME || "access_token", {
      httpOnly: true,
      secure: opts.secure,
      sameSite: opts.sameSite,
      path: opts.path,
    });
    res.json({ ok: true });
  },
};
