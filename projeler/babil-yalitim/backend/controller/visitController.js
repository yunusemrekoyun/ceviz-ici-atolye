// backend/controller/visitController.js
const Visit = require("../models/Visit");
const UAParser = require("ua-parser-js");
const { v4: uuidv4 } = require("uuid");

function hasAnalyticsConsent(req) {
  const headerConsent = String(
    req.headers["x-analytics-consent"] || ""
  ).toLowerCase();
  if (headerConsent === "true") return true;

  const bodyConsent = String(req.body?.consent || "").toLowerCase();
  if (bodyConsent === "true") return true;

  const queryConsent = String(req.query?.consent || "").toLowerCase();
  return queryConsent === "true";
}

function clampText(value, maxLength = 255) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.slice(0, maxLength);
}

function normalizePathValue(value = "") {
  const raw = clampText(value, 512);
  if (!raw) return "/";
  const [pathOnly = "/"] = raw.split(/[?#]/, 1);
  if (!pathOnly) return "/";
  return pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
}

function getSessionId(req) {
  const raw =
    req.headers["x-session-id"] ||
    req.body?.sessionId ||
    req.query?.sessionId ||
    uuidv4();

  return clampText(raw, 128) || uuidv4();
}

function toSafeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function guessSection(path = "") {
  if (!path) return "other";

  const pathValue = normalizePathValue(path);
  const normalizedPath = pathValue.startsWith("/en/")
    ? pathValue.slice(3)
    : pathValue === "/en"
      ? "/"
      : pathValue;

  if (normalizedPath === "/") return "home";
  if (normalizedPath.startsWith("/blog")) return "blog";
  if (normalizedPath.startsWith("/journal")) return "journal";
  if (
    normalizedPath.startsWith("/projects") ||
    normalizedPath.startsWith("/project-detail")
  ) {
    return "projects";
  }
  if (normalizedPath.startsWith("/services")) return "services";
  if (normalizedPath.startsWith("/about")) return "about";
  if (normalizedPath.startsWith("/whyus")) return "whyus";
  if (normalizedPath.startsWith("/iletisim")) return "contact";
  if (normalizedPath.startsWith("/kvkk")) return "kvkk";
  return "other";
}

function extractClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (xf && typeof xf === "string") {
    return xf.split(",")[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || undefined;
}

function readGeoFromHeaders(req) {
  const country =
    req.headers["x-vercel-ip-country"] ||
    req.headers["cf-ipcountry"] ||
    req.headers["x-country-code"] ||
    null;

  const city =
    req.headers["x-vercel-ip-city"] ||
    req.headers["x-city"] ||
    null;

  return {
    country:
      typeof country === "string" && country.trim() ? country.trim() : null,
    city: typeof city === "string" && city.trim() ? city.trim() : null,
  };
}

function anonymizeIp(ip = "") {
  const value = clampText(ip, 128);
  if (!value) return null;

  if (value.includes(".")) {
    const parts = value.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }

  if (value.includes(":")) {
    const parts = value.split(":");
    if (parts.length > 2) {
      return `${parts.slice(0, 4).join(":")}::`;
    }
  }

  return value;
}

const recordVisit = async (req, res) => {
  try {
    if (!hasAnalyticsConsent(req)) return res.status(204).end();

    const sessionId = getSessionId(req);

    const { path, duration, scrollDepth, section, userId } = req.body;
    const normalizedPath = normalizePathValue(path);
    const ip = extractClientIp(req);
    const geo = readGeoFromHeaders(req);
    const ua = new UAParser(req.headers["user-agent"]).getResult();

    const visit = await Visit.create({
      sessionId,
      userId: userId || null,
      ip: anonymizeIp(ip),
      country: clampText(geo?.country, 8) || null,
      city: clampText(geo?.city, 120) || null,
      path: normalizedPath,
      referrer: clampText(req.get("referer"), 1024) || null,
      userAgent: clampText(req.headers["user-agent"], 512) || null,
      browser: clampText(ua.browser?.name, 64) || null,
      os: clampText(ua.os?.name, 64) || null,
      device: clampText(ua.device?.type || "desktop", 32) || "desktop",
      duration: toSafeNumber(duration, 0),
      scrollDepth: toSafeNumber(scrollDepth, 0),
      section: clampText(section, 32) || guessSection(normalizedPath),
    });

    res.setHeader("x-session-id", sessionId);
    res.status(201).json({ visit, sessionId });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Ziyaret kaydedilemedi",
        error: error?.message || error,
      });
  }
};

const getAllVisits = async (req, res) => {
  try {
    const { from, to, section, device, country, path, limit = 200 } = req.query;
    const q = {};

    if (from || to) {
      q.createdAt = {};
      if (from) q.createdAt.$gte = new Date(from);
      if (to) q.createdAt.$lte = new Date(to);
    }
    if (section) q.section = section;
    if (device) q.device = device;
    if (country) q.country = country;
    if (path) q.path = path.startsWith("/") ? path : `/${path}`;

    const docs = await Visit.find(q)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 200, 2000));

    res.json(docs);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Ziyaretler getirilemedi",
        error: error?.message || error,
      });
  }
};

const getVisitCountByPath = async (req, res) => {
  try {
    const p = `/${(req.params.path || "").replace(/^\/+/, "")}`;
    const count = await Visit.countDocuments({ path: p });
    res.json({ path: p, count });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Ziyaret sayısı alınamadı",
        error: error?.message || error,
      });
  }
};

const getSummary = async (req, res) => {
  try {
    const { from, to } = req.query;
    const match = {};
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const [totals] = await Visit.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgDuration: { $avg: "$duration" },
          avgScroll: { $avg: "$scrollDepth" },
        },
      },
    ]);

    const bySection = await Visit.aggregate([
      { $match: match },
      { $group: { _id: "$section", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const byDevice = await Visit.aggregate([
      { $match: match },
      { $group: { _id: "$device", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      total: totals?.total || 0,
      avgDuration: Math.round(totals?.avgDuration || 0),
      avgScroll: Math.round(totals?.avgScroll || 0),
      bySection,
      byDevice,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Özet getirilemedi", error: error?.message || error });
  }
};

const getTopPages = async (req, res) => {
  try {
    const { from, to, limit = 10 } = req.query;
    const match = {};
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const top = await Visit.aggregate([
      { $match: match },
      { $group: { _id: "$path", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: Math.min(Number(limit) || 10, 100) },
    ]);

    res.json(top.map((x) => ({ path: x._id, count: x.count })));
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Popüler sayfalar getirilemedi",
        error: error?.message || error,
      });
  }
};

const getTimeseries = async (req, res) => {
  try {
    const { from, to } = req.query;
    const match = {};
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const series = await Visit.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            y: { $year: "$createdAt" },
            m: { $month: "$createdAt" },
            d: { $dayOfMonth: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.y": 1, "_id.m": 1, "_id.d": 1 } },
    ]);

    const formatted = series.map((r) => ({
      date: `${r._id.y}-${String(r._id.m).padStart(2, "0")}-${String(
        r._id.d
      ).padStart(2, "0")}`,
      count: r.count,
    }));

    res.json(formatted);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Zaman serisi getirilemedi",
        error: error?.message || error,
      });
  }
};

module.exports = {
  recordVisit,
  getAllVisits,
  getVisitCountByPath,
  getSummary,
  getTopPages,
  getTimeseries,
  hasAnalyticsConsent,
  getSessionId,
  guessSection,
  anonymizeIp,
};
