// routes/users.js
const express = require("express");
const multer = require("multer");
const User = require("../models/User");
const Blog = require("../models/Blog");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const router = express.Router();

// Multer memory storage setup
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ GET total user count
router.get("/count", async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ total: count });
  } catch (err) {
    console.error("Kullanıcı sayısı hatası:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// ✅ GET total favorite product count
router.get("/favorites/total-count", async (req, res) => {
  try {
    const count = await User.aggregate([
      { $unwind: "$favorites" },
      { $group: { _id: "$favorites" } },
      { $count: "total" },
    ]);
    res.json({ total: count[0]?.total || 0 });
  } catch (err) {
    console.error("Favori sayısı alınamadı:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// ✅ GET all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password -avatar.data");
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// ✅ GET single user by ID
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select("-password")
      .populate("favorites", "name price")
      .populate("likedBlogs", "blogId title createdAt");
    if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// ✅ GET user avatar image
router.get("/:userId/image", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("avatar");
    if (!user || !user.avatar?.data) return res.status(404).end();
    res.set("Content-Type", user.avatar.contentType);
    res.send(user.avatar.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Avatar yüklenemedi." });
  }
});

// ✅ UPDATE user (with optional avatar + password)
router.put("/:userId", upload.single("avatar"), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    if (req.file) {
      updates.avatar = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }
    const updated = await User.findByIdAndUpdate(req.params.userId, updates, {
      new: true,
    })
      .select("-password")
      .populate("favorites", "name price")
      .populate("likedBlogs", "blogId title createdAt");
    if (!updated) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı." });
    }
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// ✅ DELETE user
router.delete("/:userId", async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.userId);
    if (!deleted) {
      return res.status(404).json({ error: "Kullanıcı bulunamadı." });
    }
    res.json(deleted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// ✅ TOGGLE favorite product
router.post("/:userId/favorites/:productId", async (req, res) => {
  const { userId, productId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });
    const idx = user.favorites.indexOf(productId);
    if (idx === -1) user.favorites.push(productId);
    else user.favorites.splice(idx, 1);
    await user.save();
    res.json({ favorites: user.favorites });
  } catch (err) {
    console.error("❌ Favori işlemi hatası:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// ✅ TOGGLE liked blog
router.post("/:userId/likedBlogs/:blogId", async (req, res) => {
  const { userId, blogId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });

    // önce blogu custom blogId ile bul
    const blog = await Blog.findOne({ blogId });
    if (!blog) return res.status(404).json({ error: "Blog bulunamadı." });

    // ObjectId ile toggle
    const idx = user.likedBlogs.findIndex((id) => id.equals(blog._id));
    if (idx === -1) user.likedBlogs.push(blog._id);
    else user.likedBlogs.splice(idx, 1);

    await user.save();
    res.json({ likedBlogs: user.likedBlogs });
  } catch (err) {
    console.error("❌ Beğeni işlemi hatası:", err);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

// ✅ GET liked blogs list (görselli)
router.get("/:userId/likedBlogs", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate(
      "likedBlogs",
      "blogId title images"
    );
    if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });

    // → Burada baseUrl'i dinamik oluşturuyoruz
    const baseUrl = `${req.protocol}://${req.get("host")}`;

    const liked = user.likedBlogs.map((blog) => {
      const id = blog.blogId; // artık fallback gerek yok
      return {
        blogId: id,
        title: blog.title,
        coverImage: blog.images?.length
          ? `${baseUrl}/api/blogs/${id}/image/0`
          : null,
      };
    });

    res.json(liked);
  } catch (error) {
    console.error("Beğenilen bloglar alınamadı:", error);
    res.status(500).json({ error: "Sunucu hatası" });
  }
});

module.exports = router;
