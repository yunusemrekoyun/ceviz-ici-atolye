const Blog = require("../models/Blog");
const mediaStorage = require("../storage");
const sanitizeHtml = require("../utils/sanitizeHtml");
const {
  resolveTags,
  sanitizeCommentInput,
  toPublicComment,
} = require("../utils/blog");
const { buildRichContentHtml } = require("../utils/richContent");
const {
  parseDisplayOrder,
  syncCollectionDisplayOrder,
} = require("../utils/displayOrder");
const {
  parseMediaOrder,
  reorderMediaCollection,
} = require("../utils/mediaOrder");

const uploadOne = async (file, folder) => {
  return mediaStorage.upload(file, { folder });
};

const destroyIfExists = async (media) => mediaStorage.destroy(media);

const normalizeLocale = (value = "tr") =>
  String(value || "tr").toLowerCase().startsWith("en") ? "en" : "tr";

const hasEnglishTranslation = (blog) => {
  const en = blog?.translations?.en;
  if (!en) return false;

  return Boolean(
    String(en.title || "").trim() ||
      String(en.content || "").trim() ||
      (Array.isArray(en.tags) && en.tags.some((tag) => String(tag || "").trim()))
  );
};

const getLocalizedBlogField = (baseValue, translatedValue) => {
  if (Array.isArray(baseValue)) {
    return Array.isArray(translatedValue) && translatedValue.some((item) => String(item || "").trim())
      ? translatedValue
      : baseValue;
  }

  return String(translatedValue || "").trim() ? translatedValue : baseValue;
};

const serializePublicBlog = (blog, locale, { includeComments = false } = {}) => {
  const normalizedLocale = normalizeLocale(locale);
  const en = normalizedLocale === "en" ? blog?.translations?.en || {} : {};
  const payload = {
    _id: blog._id,
    title: getLocalizedBlogField(blog.title, en.title),
    displayOrder: blog.displayOrder,
    content: getLocalizedBlogField(blog.content, en.content),
    tags: getLocalizedBlogField(blog.tags || [], en.tags),
    cover: blog.cover,
    assets: blog.assets,
    createdAt: blog.createdAt,
    updatedAt: blog.updatedAt,
    hasEnglishTranslation: hasEnglishTranslation(blog),
  };

  if (includeComments) {
    payload.comments = (blog.comments || [])
      .filter((comment) => comment.approved)
      .map(toPublicComment);
  } else {
    payload.commentsCount = (blog.comments || []).filter((comment) => comment.approved).length;
  }

  return payload;
};

const buildEnglishTranslationPayload = (payload = {}) => {
  const title = String(payload.title || "").trim();
  const rawContent = String(payload.content || "");
  const content = rawContent.trim()
    ? sanitizeHtml(buildRichContentHtml(rawContent))
    : "";
  const tagsInput = payload.tags;
  const tags = title || content || String(tagsInput || "").trim()
    ? resolveTags(tagsInput, { title, content })
    : [];

  return { title, content, tags };
};

/* ------------ BLOG: public GET ------------ */
exports.getBlogs = async (_req, res) => {
  try {
    const locale = normalizeLocale(_req.query.locale);
    // Sıralama sort ile geliyor; normalizasyon yazma işlemlerinde yapılıyor.
    // Okuma isteğinde bulkWrite çalıştırmıyoruz.
    const items = await Blog.find().sort({ displayOrder: 1, createdAt: 1, _id: 1 });
    const lean = items.map((blog) => serializePublicBlog(blog, locale));
    res.json(lean);
  } catch (err) {
    res.status(500).json({ message: "Bloglar alınamadı", error: err.message });
  }
};

exports.getBlogById = async (req, res) => {
  try {
    const locale = normalizeLocale(req.query.locale);
    const b = await Blog.findById(req.params.id);
    if (!b) return res.status(404).json({ message: "Blog bulunamadı" });
    res.json(serializePublicBlog(b, locale, { includeComments: true }));
  } catch (err) {
    res.status(500).json({ message: "Blog alınamadı", error: err.message });
  }
};

exports.getBlogTranslations = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog bulunamadı" });

    res.json({
      _id: blog._id,
      source: {
        title: blog.title,
        content: blog.content,
        tags: blog.tags || [],
      },
      translations: {
        en: {
          title: blog.translations?.en?.title || "",
          content: blog.translations?.en?.content || "",
          tags: blog.translations?.en?.tags || [],
        },
      },
      hasEnglishTranslation: hasEnglishTranslation(blog),
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Blog çevirileri alınamadı", error: err.message });
  }
};

exports.updateBlogTranslations = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog bulunamadı" });

    blog.translations = blog.translations || {};
    blog.translations.en = buildEnglishTranslationPayload(req.body);
    blog.markModified("translations");

    await blog.save();

    res.json({
      message: "İngilizce blog çevirisi kaydedildi.",
      hasEnglishTranslation: hasEnglishTranslation(blog),
      translations: {
        en: blog.translations.en,
      },
    });
  } catch (err) {
    res.status(400).json({
      message: "Blog çevirisi kaydedilemedi",
      error: err.message,
    });
  }
};

/* ------------ BLOG: protected CREATE/UPDATE/DELETE ------------ */
// multipart: fields -> title, content, tags
// files: cover(1) required on create, assets(*) optional append
exports.createBlog = async (req, res) => {
  try {
    const { title, content } = req.body;
    const requestedOrder = parseDisplayOrder(req.body.displayOrder);
    const safeContent = sanitizeHtml(buildRichContentHtml(content));
    const tags = resolveTags(req.body.tags, {
      title,
      content: safeContent,
    });
    const coverFile = req.files?.cover?.[0];

    if (!coverFile) {
      return res.status(400).json({ message: "Kapak görseli zorunludur." });
    }

    const folder = process.env.MEDIA_BLOGS_FOLDER || "blogs";
    const cover = await uploadOne(coverFile, folder);

    let assets = [];
    if (Array.isArray(req.files?.assets) && req.files.assets.length) {
      const uploadedAssets = await Promise.all(
        req.files.assets.map((f) => uploadOne(f, `${folder}/assets`))
      );
      assets = await reorderMediaCollection({
        existing: [],
        uploaded: uploadedAssets,
        order: parseMediaOrder(req.body.assetOrder),
        destroy: destroyIfExists,
      });
    }

    const created = await Blog.create({
      title,
      ...(requestedOrder ? { displayOrder: requestedOrder } : {}),
      content: safeContent,
      tags,
      cover,
      assets,
    });

    await syncCollectionDisplayOrder(Blog, created._id, requestedOrder);
    const refreshed = await Blog.findById(created._id);

    res.status(201).json(refreshed);
  } catch (err) {
    res.status(400).json({ message: "Blog eklenemedi", error: err.message });
  }
};

exports.updateBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog bulunamadı" });

    const { title, content } = req.body;
    const requestedOrder = parseDisplayOrder(req.body.displayOrder);
    const tagsProvided = req.body.tags !== undefined;
    const nextTitle = title !== undefined ? title : blog.title;
    const nextContent =
      content !== undefined
        ? sanitizeHtml(buildRichContentHtml(content))
        : blog.content;

    if (title !== undefined) blog.title = title;
    if (content !== undefined) blog.content = nextContent;
    if (requestedOrder) blog.displayOrder = requestedOrder;
    if (tagsProvided) {
      blog.tags = resolveTags(req.body.tags, {
        title: nextTitle,
        content: nextContent,
      });
    } else if (!Array.isArray(blog.tags) || blog.tags.length === 0) {
      blog.tags = resolveTags(undefined, {
        title: nextTitle,
        content: nextContent,
      });
    }

    const folder = process.env.MEDIA_BLOGS_FOLDER || "blogs";
    const assetOrder = parseMediaOrder(req.body.assetOrder);

    // kapak REPLACE
    if (req.files?.cover?.[0]) {
      await destroyIfExists(blog.cover);
      blog.cover = await uploadOne(req.files.cover[0], folder);
    }

    // assets güncelle (image/video karışık)
    if (Array.isArray(req.files?.assets) && req.files.assets.length) {
      const uploadedAssets = await Promise.all(
        req.files.assets.map((f) => uploadOne(f, `${folder}/assets`))
      );
      blog.assets = await reorderMediaCollection({
        existing: blog.assets || [],
        uploaded: uploadedAssets,
        order: assetOrder,
        destroy: destroyIfExists,
      });
    } else if (assetOrder.length) {
      blog.assets = await reorderMediaCollection({
        existing: blog.assets || [],
        uploaded: [],
        order: assetOrder,
        destroy: destroyIfExists,
      });
    }

    const saved = await blog.save();
    await syncCollectionDisplayOrder(
      Blog,
      saved._id,
      requestedOrder || saved.displayOrder
    );
    const refreshed = await Blog.findById(saved._id);
    res.json(refreshed);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Blog güncellenemedi", error: err.message });
  }
};

exports.deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog bulunamadı" });

    await destroyIfExists(blog.cover);
    if (Array.isArray(blog.assets)) {
      await Promise.all(blog.assets.map(destroyIfExists));
    }

    await blog.deleteOne();
    await syncCollectionDisplayOrder(Blog);
    res.json({ message: "Blog silindi" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Silme işlemi başarısız", error: err.message });
  }
};

exports.setBlogOrder = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog bulunamadı" });

    const requestedOrder = parseDisplayOrder(req.body.displayOrder);
    if (!requestedOrder) {
      return res
        .status(400)
        .json({ message: "Geçerli bir gösterim sırası girin." });
    }

    await syncCollectionDisplayOrder(Blog, blog._id, requestedOrder);
    const refreshed = await Blog.findById(blog._id);
    res.json({
      message: "Blog sırası güncellendi",
      displayOrder: refreshed?.displayOrder || requestedOrder,
    });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Sıra güncellenemedi", error: err.message });
  }
};

// (opsiyonel) tek asset silme
exports.deleteAsset = async (req, res) => {
  try {
    const { id, mediaKey: mediaKeyParam } = req.params;
    const blog = await Blog.findById(id);
    if (!blog) return res.status(404).json({ message: "Blog bulunamadı" });

    const requestedKey = decodeURIComponent(String(mediaKeyParam || "").trim());
    const idx = (blog.assets || []).findIndex(
      (media) => mediaStorage.getMediaKey(media) === requestedKey
    );
    if (idx === -1)
      return res.status(404).json({ message: "Ortam bulunamadı" });

    await destroyIfExists(blog.assets[idx]);
    blog.assets.splice(idx, 1);
    await blog.save();
    res.json({ message: "Ortam silindi", assets: blog.assets });
  } catch (err) {
    res.status(400).json({ message: "Ortam silinemedi", error: err.message });
  }
};

/* ------------ COMMENTS: public create / public list-approved / admin moderate ------------ */

// public: onaylı yorumları getir (tek blog için)
exports.getApprovedComments = async (req, res) => {
  try {
    const b = await Blog.findById(req.params.id).select("comments");
    if (!b) return res.status(404).json({ message: "Blog bulunamadı" });
    const approved = (b.comments || [])
      .filter((c) => c.approved)
      .map(toPublicComment);
    res.json(approved);
  } catch (err) {
    res.status(500).json({ message: "Yorumlar alınamadı", error: err.message });
  }
};

// public: yorum gönder (ad, email, body) -> approved:false
exports.createComment = async (req, res) => {
  try {
    const safeComment = sanitizeCommentInput(req.body);
    const blog = await Blog.findById(req.params.id);
    if (!blog) return res.status(404).json({ message: "Blog bulunamadı" });

    blog.comments.push({ ...safeComment, approved: false });
    await blog.save();

    res.status(201).json({ message: "Yorum alındı, onay bekliyor." });
  } catch (err) {
    res
      .status(err.status || 400)
      .json({ message: "Yorum eklenemedi", error: err.message });
  }
};

// admin: tüm yorumları getir (approved fark etmeksizin)
exports.getAllComments = async (req, res) => {
  try {
    const b = await Blog.findById(req.params.id).select("comments title");
    if (!b) return res.status(404).json({ message: "Blog bulunamadı" });
    res.json({
      blogId: b._id,
      title: b.title,
      comments: (b.comments || []).map((comment) => ({
        _id: comment._id,
        name: comment.name,
        body: comment.body,
        approved: comment.approved,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        emailMasked: comment.emailMasked || "",
      })),
    });
  } catch (err) {
    res.status(500).json({ message: "Yorumlar alınamadı", error: err.message });
  }
};

// admin: yorum onayla / onayı kaldır
exports.setCommentApproval = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { approved } = req.body; // true/false
    const b = await Blog.findById(id);
    if (!b) return res.status(404).json({ message: "Blog bulunamadı" });

    const c = (b.comments || []).id(commentId);
    if (!c) return res.status(404).json({ message: "Yorum bulunamadı" });

    c.approved = Boolean(approved);
    await b.save();
    res.json({ message: "Güncellendi", comment: c });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Yorum güncellenemedi", error: err.message });
  }
};

// admin: yorumu sil
exports.deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const b = await Blog.findById(id);
    if (!b) return res.status(404).json({ message: "Blog bulunamadı" });

    const c = (b.comments || []).id(commentId);
    if (!c) return res.status(404).json({ message: "Yorum bulunamadı" });

    // Mongoose 7+ subdocument.remove() metodunu kaldırdı; DocumentArray.pull() kullanılır.
    b.comments.pull(commentId);
    await b.save();
    res.json({ message: "Yorum silindi" });
  } catch (err) {
    res.status(400).json({ message: "Yorum silinemedi", error: err.message });
  }
};
