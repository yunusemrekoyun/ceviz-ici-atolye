// backend/controllers/blogCategoryController.js
const BlogCategory = require("../models/BlogCategory");

// Create
exports.createBlogCategory = async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ message: "name ve slug zorunludur." });
    }

    // Slug veya name eşsiz mi kontrol et
    const exists = await BlogCategory.findOne({ $or: [{ name }, { slug }] });
    if (exists) {
      return res
        .status(400)
        .json({ message: "Bu isim veya slug zaten kullanılıyor." });
    }

    const cat = await BlogCategory.create({ name, slug, description });
    res.status(201).json(cat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kategori oluşturulamadı.", error: err });
  }
};

// Read all
exports.getBlogCategories = async (req, res) => {
  try {
    const cats = await BlogCategory.find().sort("name");
    res.json(cats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kategoriler getirilemedi." });
  }
};

// Read one
exports.getBlogCategory = async (req, res) => {
  try {
    const cat = await BlogCategory.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: "Kategori bulunamadı." });
    res.json(cat);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kategori getirilemedi." });
  }
};

// Update
exports.updateBlogCategory = async (req, res) => {
  try {
    const { name, slug, description } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ message: "name ve slug zorunludur." });
    }

    // Eşsiz kontrol (kendisi hariç)
    const conflict = await BlogCategory.findOne({
      _id: { $ne: req.params.id },
      $or: [{ name }, { slug }],
    });
    if (conflict) {
      return res
        .status(400)
        .json({ message: "Bu isim veya slug zaten kullanılıyor." });
    }

    const updated = await BlogCategory.findByIdAndUpdate(
      req.params.id,
      { name, slug, description },
      { new: true }
    );
    if (!updated)
      return res.status(404).json({ message: "Kategori bulunamadı." });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kategori güncellenemedi." });
  }
};

// Delete
exports.deleteBlogCategory = async (req, res) => {
  try {
    const deleted = await BlogCategory.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Kategori bulunamadı." });
    res.json({ message: "Kategori silindi." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kategori silinemedi." });
  }
};
