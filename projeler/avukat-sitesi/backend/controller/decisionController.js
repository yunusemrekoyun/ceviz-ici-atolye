// controller/decisionController.js
import { Decision } from "../models/Decision.js";
import { destroyAsset } from "../config/cloudinary.js";

function normCsv(input) {
  if (!input) return [];
  if (Array.isArray(input))
    return input
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
  return String(input)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Güvenli regex için kaçış
function escapeRegex(s = "") {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const decisionController = {
  /**
   * GET /api/decisions/keywords/suggest?q=ce&limit=8
   * - Sadece keywords alanında **prefix** eşleşme
   * - keyword + count + lastDate döner
   */
  async keywordSuggest(req, res, next) {
    try {
      const raw = (req.query.q || "").toString().trim();
      const limit = Math.min(parseInt(req.query.limit || "8", 10), 20);
      if (!raw) return res.json([]);

      const rx = new RegExp("^" + escapeRegex(raw), "i");

      const pipeline = [
        { $match: { status: "published", keywords: { $exists: true, $ne: [] } } },
        { $unwind: "$keywords" },
        { $match: { keywords: rx } }, // prefix
        {
          $group: {
            _id: { $toLower: "$keywords" }, // normalize
            keyword: { $first: "$keywords" },
            count: { $sum: 1 },
            lastDate: { $max: "$date" },
          },
        },
        { $sort: { count: -1, lastDate: -1, keyword: 1 } },
        { $limit: limit },
        { $project: { _id: 0, keyword: 1, count: 1, lastDate: 1 } },
      ];

      const out = await Decision.aggregate(pipeline);
      return res.json(out);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/decisions?q=...&kw=...&tag=...
   * - q  : geniş arama (title/summary/keywords içinde "contains")
   * - kw : sadece keywords’te **prefix** (başlangıç) arama
   * - tag: exact tag eşleşmesi
   */
  async list(req, res, next) {
    try {
      const { q, kw, tag } = req.query;

      const filter = { status: "published" };

      if (q) {
        const rx = new RegExp(escapeRegex(q), "i"); // contains
        filter.$or = [
          { title: rx },
          { summary: rx },
          { keywords: rx },
        ];
      }

      if (kw) {
        const rxKw = new RegExp("^" + escapeRegex(kw), "i"); // prefix
        // q da varsa, AND etkisi yaratmak için ayrı field altında birleştiriyoruz
        filter.keywords = filter.keywords || rxKw;
        if (Array.isArray(filter.$or)) {
          // $or varsa AND için $and ile birleştirelim
          const base = { $or: filter.$or };
          delete filter.$or;
          Object.assign(filter, { $and: [base, { keywords: rxKw }] });
        }
      }

      if (tag) filter.tags = tag;

      const items = await Decision.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .select("title slug date chamber summary image imageAlt tags caseNo decisionNo keywords")
        .lean();

      return res.json(items);
    } catch (err) {
      next(err);
    }
  },

  // Public detail
  async detail(req, res, next) {
    try {
      const { slug } = req.params;
      const doc = await Decision.findOne({ slug, status: "published" }).lean();
      if (!doc) return res.status(404).json({ error: "Not Found" });
      return res.json(doc);
    } catch (err) {
      next(err);
    }
  },

  // Admin create
  async create(req, res, next) {
    try {
      const b = req.body || {};
      const doc = await Decision.create({
        title: b.title,
        slug: b.slug,
        caseNo: b.caseNo,
        decisionNo: b.decisionNo,
        date: b.date,
        chamber: b.chamber,
        summary: b.summary,
        content: b.content,
        image: req.cloudinaryFile ? { ...req.cloudinaryFile } : null,
        imageAlt: b.imageAlt,
        keywords: normCsv(b.keywords),
        tags: normCsv(b.tags),
        status: b.status || "published",
      });
      return res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  },

  // Admin update
  async update(req, res, next) {
    try {
      const { slug } = req.params;
      const b = req.body || {};
      const found = await Decision.findOne({ slug });
      if (!found) return res.status(404).json({ error: "Not Found" });

      // Görsel güncellendiyse eskisini sil
      let nextImage = found.image;
      if (req.cloudinaryFile) {
        if (found.image?.publicId) {
          await destroyAsset(found.image.publicId);
        }
        nextImage = { ...req.cloudinaryFile };
      }

      // Alanlar
      found.title = b.title ?? found.title;
      found.slug = b.slug ?? found.slug;
      found.caseNo = b.caseNo ?? found.caseNo;
      found.decisionNo = b.decisionNo ?? found.decisionNo;
      found.date = b.date ?? found.date;
      found.chamber = b.chamber ?? found.chamber;
      found.summary = b.summary ?? found.summary;
      found.content = b.content ?? found.content;
      found.image = nextImage;
      found.imageAlt = b.imageAlt ?? found.imageAlt;

      if (typeof b.keywords !== "undefined")
        found.keywords = normCsv(b.keywords);
      if (typeof b.tags !== "undefined")
        found.tags = normCsv(b.tags);

      found.status = b.status ?? found.status;

      const updated = await found.save();
      return res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  // Admin delete
  async remove(req, res, next) {
    try {
      const { slug } = req.params;
      const deleted = await Decision.findOneAndDelete({ slug });
      if (!deleted) return res.status(404).json({ error: "Not Found" });

      if (deleted.image?.publicId) {
        await destroyAsset(deleted.image.publicId);
      }

      return res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
};