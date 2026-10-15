const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Category = require("../models/Category");
const multer = require("multer");

// Multer Memory Storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// CREATE
router.post("/", upload.single("img"), async (req, res) => {
  try {
    const { name, subcategories } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "Kategori resmi gerekli." });
    }

    const parsedSubs = Array.isArray(subcategories)
      ? subcategories
      : typeof subcategories === "string"
      ? JSON.parse(subcategories)
      : [];

    const newCategory = new Category({
      name,
      subcategories: parsedSubs,
      img: {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      },
    });

    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// READ ALL
router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().select("name subcategories");
    res.status(200).json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// READ SINGLE
router.get("/:categoryId", async (req, res) => {
  try {
    const category = await Category.findById(req.params.categoryId).select(
      "-img"
    );
    if (!category) {
      return res.status(404).json({ error: "Kategori bulunamadı." });
    }
    res.status(200).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// GET IMAGE
router.get("/:categoryId/image", async (req, res) => {
  try {
    const category = await Category.findById(req.params.categoryId).select(
      "img"
    );
    if (!category || !category.img?.data) return res.status(404).end();

    res.set("Content-Type", category.img.contentType);
    res.send(category.img.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Resim alınamadı." });
  }
});

// UPDATE
router.put("/:categoryId", upload.single("img"), async (req, res) => {
  try {
    const { name, subcategories } = req.body;

    const parsedSubs = Array.isArray(subcategories)
      ? subcategories
      : typeof subcategories === "string"
      ? JSON.parse(subcategories)
      : [];

    const updateData = {
      name,
      subcategories: parsedSubs,
    };

    if (req.file) {
      updateData.img = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.categoryId,
      updateData,
      { new: true }
    );
    if (!updatedCategory) {
      return res.status(404).json({ error: "Kategori bulunamadı." });
    }
    res.status(200).json(updatedCategory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

// DELETE
router.delete("/:categoryId", async (req, res) => {
  try {
    const deletedCategory = await Category.findByIdAndDelete(
      req.params.categoryId
    );
    if (!deletedCategory) {
      return res.status(404).json({ error: "Kategori bulunamadı." });
    }
    res.status(200).json(deletedCategory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Sunucu hatası." });
  }
});

module.exports = router;
