// backend/controllers/blogCommentController.js
const BlogComment = require("../models/BlogComment");
const BlogCommentReply = require("../models/BlogCommentReply");
const Blog = require("../models/Blog");
const mongoose = require("mongoose");

// mailer
const {
  sendPendingCommentMail,
  sendPendingReplyMail,
} = require("../utils/mailer");

/* ===================== YORUMLAR ===================== */

// Admin: tüm yorumları listele (approved filtresiyle)
exports.getAllComments = async (req, res) => {
  try {
    const query = {};
    if (req.query.approved === "true") query.approved = true;
    if (req.query.approved === "false") query.approved = false;
    if (req.query.seen === "true") query.seen = true;
    if (req.query.seen === "false") query.seen = false;

    const comments = await BlogComment.find(query)
      .populate("author", "firstName lastName avatar")
      .populate("blog", "title slug")
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (err) {
    console.error("🔥 getAllComments error:", err);
    res.status(500).json({ message: err.message });
  }
};
exports.markAllCommentsSeen = async (req, res) => {
  try {
    // İstersen approved filtresi de al: ?approved=false|true (default: false)
    const approved =
      req.query.approved === "true"
        ? true
        : req.query.approved === "false"
        ? false
        : false;

    const { modifiedCount } = await BlogComment.updateMany(
      { approved, seen: false },
      { $set: { seen: true } }
    );
    res.json({ updated: modifiedCount });
  } catch (err) {
    console.error("🔥 markAllCommentsSeen error:", err);
    res.status(500).json({ message: "Yorumlar seen yapılırken hata." });
  }
};
// Admin: tek bir yorumu getir (populate eklendi)
exports.getComment = async (req, res) => {
  try {
    const comment = await BlogComment.findById(req.params.id)
      .populate("author", "firstName lastName avatar")
      .populate("blog", "title slug");
    if (!comment) return res.status(404).json({ message: "Yorum bulunamadı." });
    res.json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Yorum alınırken hata oluştu." });
  }
};

// Admin: yorumu onayla
exports.approveComment = async (req, res) => {
  try {
    const comment = await BlogComment.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true }
    );
    if (!comment) return res.status(404).json({ message: "Yorum bulunamadı." });
    res.json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Yorum onaylanırken hata oluştu." });
  }
};

// Public: bir blogun sadece onaylı yorumlarını getir
exports.getCommentsByBlog = async (req, res) => {
  try {
    const comments = await BlogComment.find({
      blog: req.params.blogId,
      approved: true,
    })
      .populate("author", "firstName lastName avatar")
      .populate({
        path: "replies",
        match: { approved: true },
        populate: { path: "author", select: "firstName lastName avatar" },
      })
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Yorumlar alınırken hata oluştu." });
  }
};

// Logged-in user: yeni yorum ekle (onayda)
exports.createComment = async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    if (text.length < 2 || text.length > 1000) {
      return res.status(400).json({
        message: "Yorum 2 ile 1000 karakter arasında olmalıdır.",
      });
    }
    if (!mongoose.isValidObjectId(req.params.blogId)) {
      return res.status(404).json({ message: "Blog bulunamadı." });
    }
    const post = await Blog.findOne({
      _id: req.params.blogId,
      status: "published",
    }).select("title slug");
    if (!post) {
      return res.status(404).json({ message: "Blog bulunamadı." });
    }
    const comment = await BlogComment.create({
      blog: req.params.blogId,
      author: req.user.userId,
      text,
      // approved: false (default)
    });

    // Admin’e e-posta bildirimi (onay bekliyor)
    try {
      await sendPendingCommentMail({ comment, post });
    } catch (mailErr) {
      console.error("Onay bekleyen yorum maili gönderilemedi:", mailErr);
    }

    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Yorum oluşturulurken hata oluştu." });
  }
};

// Silme: sahibi veya admin
exports.deleteComment = async (req, res) => {
  try {
    const comment = await BlogComment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Yorum bulunamadı." });

    if (
      comment.author.toString() !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Bu yorumu silemezsiniz." });
    }

    await Promise.all([
      BlogComment.findByIdAndDelete(req.params.id),
      BlogCommentReply.deleteMany({ comment: req.params.id }),
    ]);
    res.json({ message: "Yorum silindi." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Yorum silinirken hata oluştu." });
  }
};

/* ===================== YANITLAR ===================== */

// Admin: tüm yanıtları listele (approved filtresiyle)
exports.getAllReplies = async (req, res) => {
  try {
    const approved = req.query.approved === "true";
    const replies = await BlogCommentReply.find({ approved })
      .populate("author", "firstName lastName avatar")
      .populate({
        path: "comment",
        select: "blog",
        populate: { path: "blog", select: "title slug" },
      })
      .sort({ createdAt: -1 });
    res.json(replies);
  } catch (err) {
    console.error("🔥 getAllReplies error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Admin: tek bir yanıtı getir
exports.getReply = async (req, res) => {
  try {
    const reply = await BlogCommentReply.findById(req.params.id);
    if (!reply) return res.status(404).json({ message: "Yanıt bulunamadı." });
    res.json(reply);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Yanıt alınırken hata oluştu." });
  }
};

// Admin: yanıtı onayla
exports.approveReply = async (req, res) => {
  try {
    const reply = await BlogCommentReply.findByIdAndUpdate(
      req.params.id,
      { approved: true },
      { new: true }
    );
    if (!reply) return res.status(404).json({ message: "Yanıt bulunamadı." });
    res.json(reply);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Yanıt onaylanırken hata oluştu." });
  }
};

// Public: bir yorumun onaylı yanıtlarını getir
exports.getRepliesByComment = async (req, res) => {
  try {
    const replies = await BlogCommentReply.find({
      comment: req.params.commentId,
      approved: true,
    })
      .populate("author", "firstName lastName avatar")
      .sort({ createdAt: -1 });
    res.json(replies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Yanıtlar alınırken hata oluştu." });
  }
};

// Logged-in user: yeni yanıt ekle (onayda)
exports.createReply = async (req, res) => {
  try {
    const reply = await BlogCommentReply.create({
      comment: req.params.commentId,
      author: req.user.userId,
      text: req.body.text,
      // approved: false (default)
    });

    // Admin’e e-posta bildirimi (onay bekliyor)
    try {
      const parentComment = await BlogComment.findById(req.params.commentId)
        .populate("blog", "title slug")
        .lean();
      if (parentComment) {
        const postId = parentComment.blog?._id || parentComment.blog;
        const post =
          (postId && (await Blog.findById(postId).select("title slug"))) ||
          parentComment.blog; // populate'dan geldiyse title zaten var
        await sendPendingReplyMail({
          reply,
          post,
          parentComment,
        });
      }
    } catch (mailErr) {
      console.error("Onay bekleyen yanıt maili gönderilemedi:", mailErr);
    }

    res.status(201).json(reply);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Yanıt oluşturulurken hata oluştu." });
  }
};

// Silme: sahibi veya admin
exports.deleteReply = async (req, res) => {
  try {
    const reply = await BlogCommentReply.findById(req.params.id);
    if (!reply) return res.status(404).json({ message: "Yanıt bulunamadı." });
    if (
      reply.author.toString() !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Bu yanıtı silemezsiniz." });
    }
    await BlogCommentReply.findByIdAndDelete(req.params.id);
    res.json({ message: "Yanıt silindi." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Yanıt silinirken hata oluştu." });
  }
};
