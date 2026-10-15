const Blog = require("../models/Blog");
const BlogCategory = require("../models/BlogCategory");
const BlogComment = require("../models/BlogComment");
const BlogCommentReply = require("../models/BlogCommentReply");
const mongoose = require("mongoose");
const { sendNewsletterNewBlog } = require("../utils/mailer"); // 🔥 EKLENDİ
const { MediaError } = require("../services/media/errors");
const {
  legacyAssetUrl,
  publicAsset,
  removeOwnerMediaReferences,
  requireReadyAssets,
  syncOwnerMediaReferences,
} = require("../services/media/assets");

// Helper to parse JSON-array fields
function parseArrayField(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializeBlog(blog, context = "detail") {
  const value =
    typeof blog?.toObject === "function" ? blog.toObject() : { ...blog };
  if (value.coverImageAsset && typeof value.coverImageAsset === "object") {
    value.coverImageUrl = legacyAssetUrl(value.coverImageAsset, context);
    value.coverMedia = publicAsset(value.coverImageAsset, context);
    value.coverImageAssetId = String(value.coverImageAsset._id);
  }
  return value;
}

async function syncBlogMedia(blog) {
  await syncOwnerMediaReferences({
    ownerType: "Blog",
    ownerId: blog._id,
    fields: {
      coverImage: blog.coverImageAsset ? [blog.coverImageAsset] : [],
    },
  });
}

async function listBlogs(filter) {
  const blogs = await Blog.find(filter)
    .populate("author", "firstName lastName avatar bio")
    .populate("categories", "name slug")
    .populate("coverImageAsset")
    .select("-content")
    .sort({ createdAt: -1 });

  const blogIds = blogs.map((blog) => blog._id);
  const counts = await BlogComment.aggregate([
    { $match: { blog: { $in: blogIds }, approved: true } },
    { $group: { _id: "$blog", count: { $sum: 1 } } },
  ]);
  const countMap = Object.fromEntries(
    counts.map((entry) => [entry._id.toString(), entry.count])
  );

  return blogs.map((blog) => {
    const value = serializeBlog(blog, "list");
    value.commentsCount = countMap[blog._id.toString()] || 0;
    return value;
  });
}

// — Admin CRUD —

// Create a new blog post
exports.createBlog = async (req, res) => {
  try {
    const { title, subtitle, excerpt, content, status = "draft" } = req.body;
    const categories = parseArrayField(req.body.categories);
    const tags = parseArrayField(req.body.tags);

    if (!String(title || "").trim() || !String(content || "").trim()) {
      return res.status(400).json({
        message: "Başlık ve içerik zorunludur.",
      });
    }
    if (!["draft", "published"].includes(status)) {
      return res.status(400).json({ message: "Geçersiz blog durumu." });
    }

    const [coverAsset] = await requireReadyAssets(req.body.coverImageAssetId, {
      purpose: "blog_cover",
      kind: "image",
      min: 1,
      max: 1,
    });

    for (const cid of categories) {
      if (!mongoose.isValidObjectId(cid) || !(await BlogCategory.exists({ _id: cid }))) {
        return res.status(400).json({ message: "Geçersiz blog kategorisi." });
      }
    }

    const blog = await Blog.create({
      title: String(title).trim(),
      subtitle: String(subtitle || "").trim(),
      excerpt: String(excerpt || "").trim(),
      content: String(content).trim(),
      coverImageUrl: legacyAssetUrl(coverAsset, "detail"),
      coverImageAsset: coverAsset._id,
      author: req.body.author || req.user?.userId,
      categories,
      tags,
      status,
      publishedAt: status === "published" ? new Date() : undefined,
    });
    await syncBlogMedia(blog);

    // Yalnız published içerikler bültene çıkar (kapatmak için NEWSLETTER_ON_BLOG_PUBLISH=false).
    if (status === "published" && process.env.NEWSLETTER_ON_BLOG_PUBLISH !== "false") {
      sendNewsletterNewBlog(blog, process.env.FRONTEND_ORIGIN).catch(() => {});
    }

    const populated = await Blog.findById(blog._id).populate("coverImageAsset");
    res.status(201).json(serializeBlog(populated));
  } catch (err) {
    if (err instanceof MediaError) throw err;
    console.error(err);
    res
      .status(500)
      .json({ message: "Error creating blog.", error: err.message });
  }
};

// Read all blogs (public), with optional tag filter
exports.getBlogs = async (req, res) => {
  try {
    const { tag } = req.query;
    const filter = { status: "published" };
    if (tag) {
      filter.tags = tag;
    }
    return res.json(await listBlogs(filter));
  } catch (err) {
    console.error("Error fetching blogs:", err);
    return res.status(500).json({ message: "Error fetching blogs." });
  }
};

// Read single blog (public)
exports.getBlog = async (req, res) => {
  try {
    const slugOrId = req.params.slugOrId;
    const query = {
      status: "published",
      ...(/^[0-9a-fA-F]{24}$/.test(slugOrId)
        ? { _id: slugOrId }
        : { slug: slugOrId }),
    };

    const blog = await Blog.findOne(query)
      .populate("author", "firstName lastName avatar bio")
      .populate("categories", "name slug")
      .populate("coverImageAsset");

    if (!blog) return res.status(404).json({ message: "Blog not found." });
    res.json(serializeBlog(blog));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching blog." });
  }
};

exports.getAdminBlogs = async (_req, res) => {
  try {
    return res.json(await listBlogs({}));
  } catch (err) {
    console.error("Error fetching admin blogs:", err);
    return res.status(500).json({ message: "Error fetching blogs." });
  }
};

exports.getAdminBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate("author", "firstName lastName avatar bio email")
      .populate("categories", "name slug")
      .populate("coverImageAsset");
    if (!blog) return res.status(404).json({ message: "Blog not found." });
    return res.json(serializeBlog(blog));
  } catch (err) {
    console.error("Error fetching admin blog:", err);
    return res.status(500).json({ message: "Error fetching blog." });
  }
};

// Update existing blog (admin)
exports.updateBlog = async (req, res) => {
  try {
    const { title, subtitle, excerpt, content, status } = req.body;
    const categories = parseArrayField(req.body.categories);
    const tags = parseArrayField(req.body.tags);

    if (!String(title || "").trim() || !String(content || "").trim()) {
      return res.status(400).json({ message: "Başlık ve içerik zorunludur." });
    }
    if (status && !["draft", "published"].includes(status)) {
      return res.status(400).json({ message: "Geçersiz blog durumu." });
    }

    const existing = await Blog.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: "Blog bulunamadı." });

    for (const cid of categories) {
      if (!mongoose.isValidObjectId(cid) || !(await BlogCategory.exists({ _id: cid }))) {
        return res.status(400).json({ message: "Geçersiz blog kategorisi." });
      }
    }

    const updates = {
      title: String(title).trim(),
      subtitle: String(subtitle || "").trim(),
      excerpt: String(excerpt || "").trim(),
      content: String(content).trim(),
      categories,
      tags,
    };
    if (req.body.coverImageAssetId !== undefined) {
      const [coverAsset] = await requireReadyAssets(
        req.body.coverImageAssetId,
        {
          purpose: "blog_cover",
          kind: "image",
          min: 1,
          max: 1,
        }
      );
      updates.coverImageAsset = coverAsset._id;
      updates.coverImageUrl = legacyAssetUrl(coverAsset, "detail");
    }
    if (status) {
      updates.status = status;
      if (status === "published" && existing.status !== "published") {
        updates.publishedAt = new Date();
      }
    }

    const updated = await Blog.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Blog bulunamadı." });
    await syncBlogMedia(updated);
    const populated = await Blog.findById(updated._id).populate("coverImageAsset");
    res.json(serializeBlog(populated));
  } catch (err) {
    if (err instanceof MediaError) throw err;
    console.error(err);
    res.status(500).json({ message: "Error updating blog." });
  }
};

// Delete blog (admin)
exports.deleteBlog = async (req, res) => {
  try {
    const commentIds = await BlogComment.find({ blog: req.params.id }).distinct(
      "_id"
    );
    const deleted = await Blog.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Blog bulunamadı." });

    // İlgili yorum ve yanıtları temizle
    await Promise.all([
      BlogComment.deleteMany({ blog: req.params.id }),
      BlogCommentReply.deleteMany({ comment: { $in: commentIds } }),
    ]);
    await removeOwnerMediaReferences("Blog", deleted._id);

    res.json({ message: "Blog silindi." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting blog." });
  }
};

// Read all tags with counts (public)
exports.getTags = async (req, res) => {
  try {
    const tags = await Blog.aggregate([
      { $match: { status: "published" } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $project: { tag: "$_id", count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);
    res.json(tags);
  } catch (err) {
    console.error("Error fetching tags:", err);
    res.status(500).json({ message: "Error fetching tags." });
  }
};
