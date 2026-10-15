const mongoose = require("mongoose");
const LegalDocument = require("../models/LegalDocument");
const { LEGAL_DOCUMENT_KEYS } = require("../models/LegalDocument");
const { currentDocuments, invalidateLegalDocuments } = require("../services/legalDocuments");

// GET /legal — yayındaki metinler (yalnız yönetim panelinden yayınlananlar).
exports.getPublic = async (_req, res) => {
  try {
    const documents = await currentDocuments();
    res.set("Cache-Control", "public, max-age=60");
    res.json({ documents });
  } catch (error) {
    console.error("[legal] okunamadı:", error?.message || error);
    res.status(500).json({ message: "Yasal metinler alınamadı." });
  }
};

// GET /legal/admin — her metnin yayındaki sürümü ve sürüm geçmişi.
exports.getAdmin = async (_req, res) => {
  try {
    const versions = await LegalDocument.find()
      .sort({ key: 1, version: -1 })
      .select("key version title publishedAt publishedBy")
      .populate("publishedBy", "firstName lastName email")
      .lean();
    const current = await currentDocuments();
    const documents = {};
    for (const key of LEGAL_DOCUMENT_KEYS) {
      documents[key] = {
        current: current[key] || null,
        history: versions
          .filter((v) => v.key === key)
          .map((v) => ({
            version: v.version,
            title: v.title,
            publishedAt: v.publishedAt,
            publishedBy: v.publishedBy
              ? [v.publishedBy.firstName, v.publishedBy.lastName].filter(Boolean).join(" ") || v.publishedBy.email
              : null,
          })),
      };
    }
    res.set("Cache-Control", "private, no-store");
    res.json({ documents });
  } catch (error) {
    console.error("[legal] yönetim listesi:", error?.message || error);
    res.status(500).json({ message: "Yasal metinler alınamadı." });
  }
};

// GET /legal/admin/:key/:version — eski bir sürümün tam metni.
exports.getVersion = async (req, res) => {
  const { key } = req.params;
  const version = Number.parseInt(req.params.version, 10);
  if (!LEGAL_DOCUMENT_KEYS.includes(key) || !Number.isSafeInteger(version) || version < 1) {
    return res.status(404).json({ message: "Metin bulunamadı." });
  }
  const doc = await LegalDocument.findOne({ key, version }).select("key version title body publishedAt").lean();
  if (!doc) return res.status(404).json({ message: "Metin bulunamadı." });
  res.set("Cache-Control", "private, no-store");
  res.json(doc);
};

// POST /legal/admin/:key — yeni sürüm yayınlar.
exports.publish = async (req, res) => {
  const { key } = req.params;
  if (!LEGAL_DOCUMENT_KEYS.includes(key)) return res.status(404).json({ message: "Metin bulunamadı." });
  const title = String(req.body?.title || "").trim();
  const body = String(req.body?.body || "").replace(/\r\n/g, "\n").trim();
  if (title.length < 3 || title.length > 200) {
    return res.status(400).json({ message: "Başlık 3-200 karakter olmalı." });
  }
  if (body.length < 50 || body.length > 200000) {
    return res.status(400).json({ message: "Metin en az 50, en fazla 200.000 karakter olmalı." });
  }
  try {
    const last = await LegalDocument.findOne({ key }).sort({ version: -1 }).select("version title body").lean();
    if (last && last.title === title && last.body === body) {
      return res.status(409).json({ message: "Metinde değişiklik yok; yeni sürüm oluşturulmadı." });
    }
    const created = await LegalDocument.create({
      key,
      version: (last?.version || 0) + 1,
      title,
      body,
      publishedBy: mongoose.isValidObjectId(req.user?.userId) ? req.user.userId : null,
    });
    invalidateLegalDocuments();
    res.status(201).json({ key, version: created.version, publishedAt: created.publishedAt });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "Aynı anda başka bir sürüm yayınlandı; sayfayı yenileyip tekrar deneyin." });
    }
    console.error("[legal] yayınlanamadı:", error?.message || error);
    res.status(500).json({ message: "Metin yayınlanamadı." });
  }
};
