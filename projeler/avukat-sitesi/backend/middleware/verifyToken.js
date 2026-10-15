import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export function verifyToken(requiredRole = null) {
  return async function (req, res, next) {
    try {
      const cookieName = process.env.AUTH_COOKIE_NAME || "access_token";

      // 1) Önce cookie'den dene
      let token = req.cookies?.[cookieName];

      // 2) Authorization header varsa yedek plan (örn. Postman testleri)
      if (!token) {
        const auth = req.headers.authorization || "";
        token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      }

      if (!token) return res.status(401).json({ error: "missing token" });

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.sub).lean();
      if (!user) return res.status(401).json({ error: "invalid token" });

      if (requiredRole && user.role !== requiredRole) {
        return res.status(403).json({ error: "forbidden" });
      }

      req.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      };
      next();
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "token expired" });
      }
      return res.status(401).json({ error: "invalid token" });
    }
  };
}
