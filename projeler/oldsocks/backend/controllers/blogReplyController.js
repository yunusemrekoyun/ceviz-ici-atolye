const BlogCommentReply = require("../models/BlogCommentReply");
const BlogComment = require("../models/BlogComment");
const mongoose = require("mongoose");

// Admin: tüm yanıtları listele (approved filtresiyle)
exports.getAllReplies = async (req, res) => {
  try {
    const query = {};
    if (req.query.approved === "true") query.approved = true;
    if (req.query.approved === "false") query.approved = false;
    if (req.query.seen === "true") query.seen = true;
    if (req.query.seen === "false") query.seen = false;

    const replies = await BlogCommentReply.find(query)
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
exports.markAllRepliesSeen = async (req, res) => {
  try {
    const approved =
      req.query.approved === "true"
        ? true
        : req.query.approved === "false"
        ? false
        : false;

    const { modifiedCount } = await BlogCommentReply.updateMany(
      { approved, seen: false },
      { $set: { seen: true } }
    );
    res.json({ updated: modifiedCount });
  } catch (err) {
    console.error("🔥 markAllRepliesSeen error:", err);
    res.status(500).json({ message: "Yanıtlar seen yapılırken hata." });
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
    const text = String(req.body?.text || "").trim();
    if (text.length < 2 || text.length > 1000) {
      return res.status(400).json({
        message: "Yanıt 2 ile 1000 karakter arasında olmalıdır.",
      });
    }
    if (!mongoose.isValidObjectId(req.params.commentId)) {
      return res.status(404).json({ message: "Yorum bulunamadı." });
    }
    const comment = await BlogComment.findOne({
      _id: req.params.commentId,
      approved: true,
    });
    if (!comment) {
      return res.status(404).json({ message: "Yorum bulunamadı." });
    }
    const reply = await BlogCommentReply.create({
      comment: req.params.commentId,
      author: req.user.userId,
      text,
    });
    comment.replies.addToSet(reply._id);
    await comment.save();
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
    await Promise.all([
      BlogCommentReply.findByIdAndDelete(req.params.id),
      BlogComment.updateOne(
        { _id: reply.comment },
        { $pull: { replies: reply._id } }
      ),
    ]);
    res.json({ message: "Yanıt silindi." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Yanıt silinirken hata oluştu." });
  }
};
