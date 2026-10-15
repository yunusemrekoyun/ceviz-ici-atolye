const Project = require("../models/Project");
const mediaStorage = require("../storage");
const {
  parseDisplayOrder,
  syncCollectionDisplayOrder,
} = require("../utils/displayOrder");
const {
  parseMediaOrder,
  reorderMediaCollection,
} = require("../utils/mediaOrder");

/* ---------- helpers ---------- */
const uploadOne = async (file, folder, forceType) => {
  return mediaStorage.upload(file, {
    folder,
    resourceType: forceType || "auto",
  });
};

const destroyIfExists = async (media) => mediaStorage.destroy(media);

const parseBoolean = (value) =>
  /^(1|true|yes|on)$/i.test(String(value || "").trim());

const normalizeLocale = (value = "tr") =>
  String(value || "tr").toLowerCase().startsWith("en") ? "en" : "tr";

const hasEnglishTranslation = (project) => {
  const en = project?.translations?.en;
  if (!en) return false;

  return Boolean(
    String(en.title || "").trim() ||
      String(en.description || "").trim() ||
      String(en.category || "").trim()
  );
};

const getLocalizedField = (baseValue, translatedValue) =>
  String(translatedValue || "").trim() ? translatedValue : baseValue;

const serializePublicProject = (project, locale) => {
  const normalizedLocale = normalizeLocale(locale);
  const en = normalizedLocale === "en" ? project?.translations?.en || {} : {};

  return {
    _id: project._id,
    title: getLocalizedField(project.title, en.title),
    displayOrder: project.displayOrder,
    description: getLocalizedField(project.description, en.description),
    category: getLocalizedField(project.category, en.category),
    cover: project.cover,
    video: project.video,
    images: project.images,
    startDate: project.startDate,
    endDate: project.endDate,
    completedAt: project.completedAt,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    durationDays: project.durationDays,
    hasEnglishTranslation: hasEnglishTranslation(project),
  };
};

const buildEnglishTranslationPayload = (payload = {}) => ({
  title: String(payload.title || "").trim(),
  description: String(payload.description || "").trim(),
  category: String(payload.category || "").trim(),
});

// Tarih parse helper
const parseDate = (v) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string" && v.trim() === "") return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
};

/* ---------- GET ---------- */
exports.getProjects = async (req, res) => {
  try {
    const locale = normalizeLocale(req.query.locale);
    // Sıralama sort ile geliyor; normalizasyon yazma işlemlerinde yapılıyor.
    const items = await Project.find().sort({ displayOrder: 1, createdAt: 1, _id: 1 });
    res.json(items.map((item) => serializePublicProject(item, locale)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const locale = normalizeLocale(req.query.locale);
    const item = await Project.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Proje bulunamadı" });
    res.json(serializePublicProject(item, locale));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProjectTranslations = async (req, res) => {
  try {
    const item = await Project.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Proje bulunamadı" });

    res.json({
      _id: item._id,
      source: {
        title: item.title,
        description: item.description || "",
        category: item.category || "",
      },
      translations: {
        en: {
          title: item.translations?.en?.title || "",
          description: item.translations?.en?.description || "",
          category: item.translations?.en?.category || "",
        },
      },
      hasEnglishTranslation: hasEnglishTranslation(item),
    });
  } catch (err) {
    res.status(500).json({
      message: "Proje çevirileri alınamadı",
      error: err.message,
    });
  }
};

exports.updateProjectTranslations = async (req, res) => {
  try {
    const item = await Project.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Proje bulunamadı" });

    item.translations = item.translations || {};
    item.translations.en = buildEnglishTranslationPayload(req.body);
    item.markModified("translations");

    await item.save();

    res.json({
      message: "İngilizce proje çevirisi kaydedildi.",
      hasEnglishTranslation: hasEnglishTranslation(item),
      translations: {
        en: item.translations.en,
      },
    });
  } catch (err) {
    res.status(400).json({
      message: "Proje çevirisi kaydedilemedi",
      error: err.message,
    });
  }
};

/* ---------- CREATE ---------- */
exports.createProject = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      startDate,
      endDate,
      completedAt,
      displayOrder,
    } =
      req.body;
    const requestedOrder = parseDisplayOrder(displayOrder);

    const files = req.files || {};
    const coverFile = files.cover?.[0];
    if (!coverFile) {
      return res.status(400).json({ message: "Kapak medyası zorunludur." });
    }

    const folder = process.env.MEDIA_PROJECTS_FOLDER || "projects";

    const cover = await uploadOne(coverFile, folder, null);

    let video;
    if (files.video?.[0]) {
      video = await uploadOne(files.video[0], folder, "video");
    }

    let images = [];
    if (Array.isArray(files.images) && files.images.length) {
      const uploadedImages = await Promise.all(
        files.images.slice(0, 4).map((f) => uploadOne(f, folder, "image"))
      );
      images = await reorderMediaCollection({
        existing: [],
        uploaded: uploadedImages,
        order: parseMediaOrder(req.body.imageOrder),
        destroy: destroyIfExists,
      });
    }

    const payload = {
      title,
      ...(requestedOrder ? { displayOrder: requestedOrder } : {}),
      description,
      category,
      cover,
      video,
      images,
      startDate: parseDate(startDate),
      endDate: parseDate(endDate),
      completedAt: parseDate(completedAt),
    };

    if (!payload.completedAt && payload.endDate) {
      payload.completedAt = payload.endDate;
    }

    const created = await Project.create(payload);
    await syncCollectionDisplayOrder(Project, created._id, requestedOrder);
    const refreshed = await Project.findById(created._id);
    res.status(201).json(refreshed);
  } catch (err) {
    res.status(400).json({
      message: "Proje eklenemedi",
      error: err?.message || String(err),
    });
  }
};

/* ---------- UPDATE ---------- */
exports.updateProject = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      startDate,
      endDate,
      completedAt,
      displayOrder,
    } =
      req.body;
    const requestedOrder = parseDisplayOrder(displayOrder);

    const proj = await Project.findById(req.params.id);
    if (!proj) return res.status(404).json({ message: "Proje bulunamadı" });

    const files = req.files || {};
    const folder = process.env.MEDIA_PROJECTS_FOLDER || "projects";
    const imageOrder = parseMediaOrder(req.body.imageOrder);
    const removeVideo = parseBoolean(req.body.removeVideo);

    if (title !== undefined) proj.title = title;
    if (requestedOrder) proj.displayOrder = requestedOrder;
    if (description !== undefined) proj.description = description;
    if (category !== undefined) proj.category = category;
    if (startDate !== undefined) proj.startDate = parseDate(startDate);
    if (endDate !== undefined) proj.endDate = parseDate(endDate);
    if (completedAt !== undefined) proj.completedAt = parseDate(completedAt);

    if (files.cover?.[0]) {
      await destroyIfExists(proj.cover);
      proj.cover = await uploadOne(files.cover[0], folder, null);
    }

    if (files.video?.[0]) {
      await destroyIfExists(proj.video);
      proj.video = await uploadOne(files.video[0], folder, "video");
    } else if (removeVideo && proj.video) {
      await destroyIfExists(proj.video);
      proj.video = undefined;
    }

    if (Array.isArray(files.images) && files.images.length) {
      const uploadedImages = await Promise.all(
        files.images.slice(0, 4).map((f) => uploadOne(f, folder, "image"))
      );
      const nextImages = await reorderMediaCollection({
        existing: proj.images || [],
        uploaded: uploadedImages,
        order: imageOrder,
        destroy: destroyIfExists,
      });

      if (nextImages.length > 4) {
        await Promise.all(
          uploadedImages
            .filter((media) =>
              nextImages.some(
                (item) =>
                  mediaStorage.getMediaKey(item) === mediaStorage.getMediaKey(media)
              )
            )
            .map((media) => destroyIfExists(media))
        );
        return res
          .status(400)
          .json({ message: "En fazla 4 görsel kaydedebilirsiniz." });
      }

      proj.images = nextImages;
    } else if (imageOrder.length) {
      const nextImages = await reorderMediaCollection({
        existing: proj.images || [],
        uploaded: [],
        order: imageOrder,
        destroy: destroyIfExists,
      });
      if (nextImages.length > 4) {
        return res
          .status(400)
          .json({ message: "En fazla 4 görsel kaydedebilirsiniz." });
      }
      proj.images = nextImages;
    }

    const saved = await proj.save();
    await syncCollectionDisplayOrder(
      Project,
      saved._id,
      requestedOrder || saved.displayOrder
    );
    const refreshed = await Project.findById(saved._id);
    res.json(refreshed);
  } catch (err) {
    res.status(400).json({
      message: "Proje güncellenemedi",
      error: err?.message || String(err),
    });
  }
};

exports.getProjectCovers = async (req, res) => {
  try {
    const locale = normalizeLocale(req.query.locale);
    // Sadece gerekli alanları çek (performans)
    const items = await Project.find(
      {},
      {
        _id: 1,
        title: 1,
        displayOrder: 1,
        "translations.en.title": 1,
        // cover detayları
        "cover.url": 1,
        "cover.resourceType": 1,
        "cover.posterUrl": 1,
        // images sadece ilkini alalım
        images: { $slice: 1 },
        // video detayları
        "video.url": 1,
        "video.posterUrl": 1,
      }
    )
      .sort({ displayOrder: 1, createdAt: 1, _id: 1 })
      .lean();

    const mapped = items.map((p) => {
      let mobileCoverUrl = null;

      // 1) cover image ise direkt onu kullan
      if (p?.cover?.resourceType === "image" && p.cover.url) {
        mobileCoverUrl = p.cover.url;
      }

      // 2) değilse images[0] varsa onu kullan
      if (!mobileCoverUrl) {
        const firstImg =
          Array.isArray(p.images) && p.images.length ? p.images[0] : null;
        if (firstImg?.url) {
          mobileCoverUrl = firstImg.url;
        }
      }

      // 3) hâlâ yoksa video posteri üret
      if (!mobileCoverUrl && p?.video?.posterUrl) {
        mobileCoverUrl = p.video.posterUrl;
      }

      if (!mobileCoverUrl && p?.video?.url) {
        mobileCoverUrl = p.video.url;
      }

      return {
        _id: p._id,
        title:
          locale === "en"
            ? getLocalizedField(p.title, p?.translations?.en?.title)
            : p.title,
        displayOrder: p.displayOrder,
        mobileCoverUrl, // <-- sadece mobilde bunu kullanacağız
        hasEnglishTranslation: hasEnglishTranslation(p),
      };
    });

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
/* ---------- DELETE ---------- */
exports.deleteProject = async (req, res) => {
  try {
    const proj = await Project.findById(req.params.id);
    if (!proj) return res.status(404).json({ message: "Proje bulunamadı" });

    await destroyIfExists(proj.cover);
    await destroyIfExists(proj.video);
    if (Array.isArray(proj.images)) {
      await Promise.all(proj.images.map(destroyIfExists));
    }

    await proj.deleteOne();
    await syncCollectionDisplayOrder(Project);
    res.json({ message: "Proje silindi" });
  } catch (err) {
    res.status(500).json({ message: "Silme başarısız", error: err.message });
  }
};

exports.setProjectOrder = async (req, res) => {
  try {
    const proj = await Project.findById(req.params.id);
    if (!proj) return res.status(404).json({ message: "Proje bulunamadı" });

    const requestedOrder = parseDisplayOrder(req.body.displayOrder);
    if (!requestedOrder) {
      return res
        .status(400)
        .json({ message: "Geçerli bir gösterim sırası girin." });
    }

    await syncCollectionDisplayOrder(Project, proj._id, requestedOrder);
    const refreshed = await Project.findById(proj._id);
    res.json({
      message: "Proje sırası güncellendi",
      displayOrder: refreshed?.displayOrder || requestedOrder,
    });
  } catch (err) {
    res
      .status(400)
      .json({ message: "Sıra güncellenemedi", error: err.message });
  }
};
