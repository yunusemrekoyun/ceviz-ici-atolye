// routes/blogs.js
const express = require("express");
const multer = require("multer");
const Blog = require("../models/Blog");
const Comment = require("../models/BlogComment");
const User = require("../models/User");
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// CREATE blog (max 3 images)
router.post("/", upload.array("images", 3), async (req, res) => {
  try {
    const { title, content } = req.body;
    const images = req.files.map((f) => ({
      data: f.buffer,
      contentType: f.mimetype,
    }));
    const blog = new Blog({ title, content, images });
    await blog.save();
    res.status(201).json(blog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET all blogs (without images)
router.get("/", async (req, res) => {
  const blogs = await Blog.aggregate([
    { $sort: { createdAt: -1 } },

    // beğeni sayısı
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "likedBlogs",
        as: "likedUsers",
      },
    },
    // yorum sayısı
    {
      $lookup: {
        from: "blogcomments", // koleksiyon adı: küçük harf ve pluralsiz değilse DB'deki ismiyle
        localField: "_id",
        foreignField: "blog",
        as: "comments",
      },
    },

    // alanları ekle
    {
      $addFields: {
        likesCount: { $size: "$likedUsers" },
        commentsCount: { $size: "$comments" },
      },
    },

    // istemediğimiz iç array’leri at
    { $project: { likedUsers: 0, comments: 0, images: 0 } },
  ]);
  res.json(blogs);
});

// GET single blog by blogId (include imagesCount)
router.get("/:blogId", async (req, res) => {
  try {
    const blog = await Blog.findOne({ blogId: req.params.blogId });
    if (!blog) return res.status(404).json({ error: "Blog bulunamadı." });
    const obj = blog.toObject();
    obj.imagesCount = blog.images.length;
    obj.likesCount = await User.countDocuments({ likedBlogs: blog._id });

    obj.likedByCurrentUser = Boolean(
      req.query.userId &&
        (await User.exists({ _id: req.query.userId, likedBlogs: blog._id }))
    );
    if (!req.query.withImages) delete obj.images;
    res.json(obj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET specific image by index
router.get("/:blogId/image/:index", async (req, res) => {
  try {
    const blog = await Blog.findOne({ blogId: req.params.blogId }).select(
      "images"
    );
    const idx = Number(req.params.index);
    if (!blog || !blog.images[idx]) return res.status(404).end();
    res.set("Content-Type", blog.images[idx].contentType);
    res.send(blog.images[idx].data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Görsel gösterilemedi." });
  }
});

// UPDATE blog (PUT)
router.put("/:blogId", upload.array("images", 3), async (req, res) => {
  try {
    const blog = await Blog.findOne({ blogId: req.params.blogId });
    if (!blog) return res.status(404).json({ error: "Blog bulunamadı." });
    if (req.body.title) blog.title = req.body.title;
    if (req.body.content) blog.content = req.body.content;
    const toDelete = req.body.toDeleteIndexes
      ? JSON.parse(req.body.toDeleteIndexes)
      : [];
    toDelete.sort((a, b) => b - a).forEach((i) => blog.images.splice(i, 1));
    if (req.files.length) {
      blog.images.push(
        ...req.files.map((f) => ({
          data: f.buffer,
          contentType: f.mimetype,
        }))
      );
    }
    blog.images = blog.images.slice(0, 3);
    await blog.save();
    const obj = blog.toObject();
    obj.imagesCount = blog.images.length;
    delete obj.images;
    res.json(obj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE blog
router.delete("/:blogId", async (req, res) => {
  try {
    await Blog.findOneAndDelete({ blogId: req.params.blogId });
    res.json({ message: "Silindi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
//  Toplam blog beğenisi sayısı
router.get("/likes/total-count", async (req, res) => {
  try {
    const count = await User.aggregate([
      { $unwind: "$likedBlogs" },
      { $group: { _id: "$likedBlogs" } },
      { $count: "total" },
    ]);
    res.json({ total: count[0]?.total || 0 });
  } catch (err) {
    console.error("Blog beğeni sayısı alınamadı:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});
// COMMENTS – list
router.get("/:blogId/comments", async (req, res) => {
  try {
    const blog = await Blog.findOne({ blogId: req.params.blogId });
    const comments = await Comment.find({ blog: blog._id }).populate(
      "user",
      "username"
    );
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// COMMENTS – add
router.post("/:blogId/comments", async (req, res) => {
  try {
    const blog = await Blog.findOne({ blogId: req.params.blogId });
    const comment = new Comment({
      blog: blog._id,
      user: req.body.userId,
      content: req.body.content,
    });
    await comment.save();
    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
