// controller/articleController.js
import { Article } from "../models/Article.js";
import { destroyAsset } from "../config/cloudinary.js";

function normTags(input) {
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

export const articleController = {
  // Public
  async list(req, res, next) {
    try {
      const { q, tag } = req.query;
      const filter = { status: "published" };
      if (q) {
        filter.$or = [
          { title: new RegExp(q, "i") },
          { summary: new RegExp(q, "i") },
          { tags: new RegExp(q, "i") },
        ];
      }
      if (tag) filter.tags = tag;

      const items = await Article.find(filter)
        .sort({ publishedAt: -1 })
        .select("title slug summary image imageAlt tags publishedAt")
        .lean();

      res.json(items);
    } catch (err) {
      next(err);
    }
  },

  async detail(req, res, next) {
    try {
      const { slug } = req.params;
      const doc = await Article.findOne({ slug, status: "published" }).lean();
      if (!doc) return res.status(404).json({ error: "Not Found" });
      res.json(doc);
    } catch (err) {
      next(err);
    }
  },

  // Admin
  async create(req, res, next) {
    try {
      const body = req.body || {};
      const doc = await Article.create({
        title: body.title,
        slug: body.slug,
        summary: body.summary,
        content: body.content,
        image: req.cloudinaryFile ? { ...req.cloudinaryFile } : null,
        imageAlt: body.imageAlt,
        tags: normTags(body.tags),
        publishedAt: body.publishedAt || Date.now(),
        status: body.status || "published",
      });
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { slug } = req.params;
      const body = req.body || {};
      const found = await Article.findOne({ slug });
      if (!found) return res.status(404).json({ error: "Not Found" });

      // eski görsel silinecek mi?
      let nextImage = found.image;
      if (req.cloudinaryFile) {
        // yeni yüklendiyse eskiyi sil
        if (found.image?.publicId) await destroyAsset(found.image.publicId);
        nextImage = { ...req.cloudinaryFile };
      }

      found.title = body.title ?? found.title;
      found.slug = body.slug ?? found.slug; // slug değişimine izin veriyoruz
      found.summary = body.summary ?? found.summary;
      found.content = body.content ?? found.content;
      found.image = nextImage;
      found.imageAlt = body.imageAlt ?? found.imageAlt;
      if (typeof body.tags !== "undefined") found.tags = normTags(body.tags);
      found.publishedAt = body.publishedAt ?? found.publishedAt;
      found.status = body.status ?? found.status;

      const updated = await found.save();
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const { slug } = req.params;
      const deleted = await Article.findOneAndDelete({ slug });
      if (!deleted) return res.status(404).json({ error: "Not Found" });

      if (deleted.image?.publicId) {
        await destroyAsset(deleted.image.publicId);
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
};
