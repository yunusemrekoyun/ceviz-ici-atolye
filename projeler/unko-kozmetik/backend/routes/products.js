/********************************************************
 * backend/routes/products.js
 ********************************************************/
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const Category = require("../models/Category.js");
const Product = require("../models/Product.js");
const authMiddleware = require("../middlewares/authMiddleware");
const requireAdmin = require("../middlewares/requireAdmin");
const {
  HttpError,
  asyncHandler,
  escapeRegex,
  exactMatch,
} = require("../utils/http");
const {
  LIST_PROJECTION,
  serializeImages,
  serializeProduct,
} = require("../utils/productSerializer");

const MAX_IMAGES = 6;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: MAX_IMAGES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(
      new HttpError(
        400,
        "Sadece JPG, PNG, WEBP, GIF veya AVIF görsel yükleyebilirsiniz."
      )
    );
  },
});

// "a, b" ya da ["a","b"] → ["a","b"] (boş ve tekrar edenler atılır)
const parseList = (value) => {
  const arr = Array.isArray(value)
    ? value
    : typeof value === "string"
    ? value.split(",")
    : [];
  return [...new Set(arr.map((v) => String(v).trim()).filter(Boolean))];
};

const parsePrice = (current, discount) => {
  const currentNum = Number(current);
  const discountNum =
    discount === undefined ||
    discount === "" ||
    discount === "undefined" ||
    discount === "null"
      ? 0
      : Number(discount);
  if (!Number.isFinite(currentNum) || currentNum <= 0) {
    throw new HttpError(400, "Fiyat 0'dan büyük olmalıdır.");
  }
  if (!Number.isFinite(discountNum) || discountNum < 0 || discountNum > 100) {
    throw new HttpError(400, "İndirim oranı 0 ile 100 arasında olmalıdır.");
  }
  return { current: currentNum, discount: discountNum };
};

const ensureCategory = async (categoryId) => {
  if (
    !mongoose.isValidObjectId(categoryId) ||
    !(await Category.exists({ _id: categoryId }))
  ) {
    throw new HttpError(400, "Geçerli bir kategori seçin.");
  }
};

const filesToImages = (files = []) =>
  files.map((file) => ({ data: file.buffer, contentType: file.mimetype }));

/********************************************************
Yorum İşlemleri
********************************************************/
// Kullanıcıdan yeni yorum alma
router.post(
  "/:productId/reviews",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
    const rating = Number(req.body.rating);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new HttpError(400, "Puan 1 ile 5 arasında olmalıdır.");
    }
    if (text.length < 3 || text.length > 1000) {
      throw new HttpError(400, "Yorum 3 ile 1000 karakter arasında olmalıdır.");
    }

    const product = await Product.findById(req.params.productId).select(
      "reviews"
    );
    if (!product) throw new HttpError(404, "Ürün bulunamadı.");

    product.reviews.push({ text, rating, user: req.user.id });
    await product.save();

    res.status(201).json({
      success: true,
      message:
        "Yorumunuz başarıyla alındı, onaylandıktan sonra yayınlanacaktır.",
    });
  })
);

// Admin için yorumları listeleme (?approved=true|false)
router.get(
  "/admin/reviews",
  authMiddleware,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const approved = req.query.approved === "true";
    const products = await Product.find({ "reviews.approved": approved })
      .select("name reviews")
      .populate("reviews.user", "username");

    const allReviews = [];
    products.forEach((p) => {
      p.reviews.forEach((r) => {
        if (r.approved === approved) {
          allReviews.push({
            productId: p._id,
            productName: p.name,
            reviewId: r._id,
            text: r.text,
            rating: r.rating,
            user: r.user?.username || "Silinmiş kullanıcı",
            createdAt: r.createdAt,
            approved: r.approved,
          });
        }
      });
    });

    res.status(200).json({
      success: true,
      data: allReviews,
      message: "Yorumlar başarıyla listelendi.",
    });
  })
);

// Admin yorum onaylama
router.put(
  "/:productId/reviews/:reviewId/approve",
  authMiddleware,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId).select(
      "reviews"
    );
    if (!product) throw new HttpError(404, "Ürün bulunamadı.");

    const review = product.reviews.id(req.params.reviewId);
    if (!review) throw new HttpError(404, "Yorum bulunamadı.");

    review.approved = true;
    await product.save();

    res
      .status(200)
      .json({ success: true, message: "Yorum başarıyla onaylandı." });
  })
);

// Admin yorum silme
router.delete(
  "/:productId/reviews/:reviewId",
  authMiddleware,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId).select(
      "reviews"
    );
    if (!product) throw new HttpError(404, "Ürün bulunamadı.");

    const review = product.reviews.id(req.params.reviewId);
    if (!review) throw new HttpError(404, "Yorum bulunamadı.");

    review.deleteOne();
    await product.save();

    res
      .status(200)
      .json({ success: true, message: "Yorum başarıyla silindi." });
  })
);

/********************************************************
Admin İşlemleri
********************************************************/
// Yeni bir ürün oluşturma
router.post(
  "/",
  authMiddleware,
  requireAdmin,
  upload.array("img", MAX_IMAGES),
  asyncHandler(async (req, res) => {
    const {
      name,
      category,
      brand,
      description,
      colors,
      sizes,
      current,
      discount,
    } = req.body;

    if (!name?.trim() || !brand?.trim() || !description?.trim()) {
      throw new HttpError(400, "İsim, kategori, marka ve açıklama zorunludur.");
    }
    if (!req.files?.length) {
      throw new HttpError(400, "En az bir görsel yüklenmelidir.");
    }
    await ensureCategory(category);

    const product = await Product.create({
      name: name.trim(),
      img: filesToImages(req.files),
      description: description.trim(),
      colors: parseList(colors),
      sizes: parseList(sizes),
      price: parsePrice(current, discount),
      category,
      brand: brand.trim().toLowerCase(),
    });

    res.status(201).json({
      success: true,
      data: serializeProduct(product),
      message: "Ürün başarıyla oluşturuldu.",
    });
  })
);

// Ürün güncelleme
router.put(
  "/:productId",
  authMiddleware,
  requireAdmin,
  upload.array("img", MAX_IMAGES),
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);
    if (!product) throw new HttpError(404, "Ürün bulunamadı.");

    const {
      name,
      category,
      brand,
      description,
      current,
      discount,
      colors,
      sizes,
      keepImages,
      deletedImages,
    } = req.body;

    const parseIds = (value, field) => {
      try {
        const ids = JSON.parse(value);
        if (!Array.isArray(ids)) throw new Error();
        return ids.map(String);
      } catch {
        throw new HttpError(400, `${field} formatı geçersiz.`);
      }
    };

    // Mevcut resimlerden korunacak olanları filtrele
    if (keepImages !== undefined) {
      const keepIds = parseIds(keepImages, "keepImages");
      product.img = product.img.filter((img) =>
        keepIds.includes(img._id.toString())
      );
    }

    // Silinecek resimleri kaldır
    if (deletedImages !== undefined) {
      const deletedIds = parseIds(deletedImages, "deletedImages");
      product.img = product.img.filter(
        (img) => !deletedIds.includes(img._id.toString())
      );
    }

    // Yeni görselleri ekle
    product.img.push(...filesToImages(req.files));

    if (product.img.length === 0) {
      throw new HttpError(400, "Üründe en az bir görsel olmalıdır.");
    }
    if (product.img.length > MAX_IMAGES) {
      throw new HttpError(
        400,
        `En fazla ${MAX_IMAGES} görsel yükleyebilirsiniz.`
      );
    }

    // Diğer alanları güncelle
    if (name?.trim()) product.name = name.trim();
    if (category) {
      await ensureCategory(category);
      product.category = category;
    }
    if (brand?.trim()) product.brand = brand.trim().toLowerCase();
    if (description?.trim()) product.description = description.trim();
    if (current !== undefined) product.price = parsePrice(current, discount);
    product.colors = parseList(colors);
    product.sizes = parseList(sizes);

    await product.save();

    res.status(200).json({
      success: true,
      data: serializeProduct(product),
      message: "Ürün başarıyla güncellendi.",
    });
  })
);

// Ürün silme
router.delete(
  "/:productId",
  authMiddleware,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const deletedProduct = await Product.findByIdAndDelete(
      req.params.productId
    );
    if (!deletedProduct) throw new HttpError(404, "Ürün bulunamadı.");
    res.status(200).json({ success: true, message: "Ürün başarıyla silindi." });
  })
);

/********************************************************
Herkese Açık İşlemler
********************************************************/
// Tüm ürünleri getirme
// ?category=<isim>|group=<menü grubu>&brand=a,b&discounted=true&priceMin=&priceMax=&sort=
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const {
      category,
      group,
      colors,
      sizes,
      priceMin,
      priceMax,
      sort,
      brand,
      discounted,
    } = req.query;
    const queryObj = {};

    // 1) Kategori (isim üzerinden)
    if (category) {
      const foundCat = await Category.findOne({ name: exactMatch(category) });
      if (!foundCat) return res.status(200).json([]);
      queryObj.category = foundCat._id;
    } else if (group) {
      // Menü grubundaki tüm kategoriler (örn. "Cilt Bakımı")
      const groupCats = await Category.find({
        group: exactMatch(group),
      }).select("_id");
      if (!groupCats.length) return res.status(200).json([]);
      queryObj.category = { $in: groupCats.map((c) => c._id) };
    }

    // 2) Marka: ?brand=clear&brand=gliss  veya  ?brand=clear,gliss
    const brands = parseList(brand).map((b) => b.toLowerCase());
    if (brands.length) queryObj.brand = { $in: brands };

    // 3) Renk / Boyut
    const colorList = parseList(colors);
    if (colorList.length) queryObj.colors = { $in: colorList };
    const sizeList = parseList(sizes);
    if (sizeList.length) queryObj.sizes = { $in: sizeList };

    // 4) Fiyat
    if (priceMin || priceMax) {
      queryObj["price.current"] = {};
      if (priceMin) queryObj["price.current"].$gte = Number(priceMin) || 0;
      if (priceMax)
        queryObj["price.current"].$lte =
          Number(priceMax) || Number.MAX_SAFE_INTEGER;
    }

    // 5) Sadece indirimli ürünler
    if (discounted === "true") queryObj["price.discount"] = { $gt: 0 };

    const SORTS = {
      priceAsc: { "price.current": 1 },
      priceDesc: { "price.current": -1 },
      nameAsc: { name: 1 },
      nameDesc: { name: -1 },
      dateAsc: { createdAt: 1 },
      dateDesc: { createdAt: -1 },
    };

    const products = await Product.find(queryObj)
      .select(LIST_PROJECTION)
      .sort(SORTS[sort] || { createdAt: -1 });

    res.status(200).json(products.map(serializeProduct));
  })
);

// Ürün isme göre arama
router.get(
  "/search/:productName",
  asyncHandler(async (req, res) => {
    const term = req.params.productName.trim();
    if (!term) throw new HttpError(400, "Arama terimi boş olamaz.");

    const products = await Product.find({
      $or: [
        { name: { $regex: escapeRegex(term), $options: "i" } },
        { brand: { $regex: escapeRegex(term), $options: "i" } },
      ],
    })
      .select(LIST_PROJECTION)
      .limit(20);

    res.status(200).json(products.map(serializeProduct));
  })
);

// Ürün görseli
router.get(
  "/:productId/images/:imageId",
  asyncHandler(async (req, res) => {
    const { productId, imageId } = req.params;
    if (
      !mongoose.isValidObjectId(productId) ||
      !mongoose.isValidObjectId(imageId)
    ) {
      throw new HttpError(404, "Görsel bulunamadı.");
    }
    const product = await Product.findOne(
      { _id: productId, "img._id": imageId },
      { "img.$": 1 }
    );
    const image = product?.img?.[0];
    if (!image?.data) throw new HttpError(404, "Görsel bulunamadı.");

    // Görsel ID'leri değişmediği için uzun süre önbelleğe alınabilir
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.type(image.contentType || "application/octet-stream");
    res.send(image.data);
  })
);

// Tek ürün getirme
router.get(
  "/:productId",
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId)
      .select("-img.data -img.contentType")
      .populate("reviews.user", "username")
      .populate("category", "name");
    if (!product) throw new HttpError(404, "Ürün bulunamadı.");

    // Sadece onaylı yorumlar gösterilir
    const reviews = product.reviews
      .filter((r) => r.approved)
      .map((r) => ({
        _id: r._id,
        text: r.text,
        rating: r.rating,
        user: { username: r.user?.username || "Silinmiş kullanıcı" },
        createdAt: r.createdAt,
      }))
      .reverse();

    res.status(200).json({
      ...serializeProduct(product),
      img: serializeImages(product),
      reviews,
    });
  })
);

module.exports = router;
