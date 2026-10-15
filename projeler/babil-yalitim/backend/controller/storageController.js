const fs = require("fs/promises");
const path = require("path");

const Blog = require("../models/Blog");
const Journal = require("../models/Journal");
const Project = require("../models/Project");
const Service = require("../models/Service");
const { MEDIA_ROOT } = require("../storage");
const { buildStorageReport, isContentFile } = require("../utils/storageReport");

const normalizeKey = (value = "") =>
  String(value || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");

const resolveAbsolute = (key) =>
  path.join(MEDIA_ROOT, ...normalizeKey(key).split("/"));

const toKeyList = (body) => {
  const raw = Array.isArray(body?.storageKeys) ? body.storageKeys : [];
  return [...new Set(raw.map(normalizeKey).filter(Boolean))];
};

/* -------------------- GET: rapor -------------------- */
exports.getStorageSummary = async (_req, res) => {
  try {
    const report = await buildStorageReport();
    res.json(report);
  } catch (error) {
    res.status(500).json({
      message: "Depolama raporu oluşturulamadı",
      error: error.message,
    });
  }
};

/* -------------------- Arşiv silme -------------------- */

// Bir dokumandaki medya agacinda, verilen arsiv anahtarlarina sahip
// kayitlarin `original` alanini kaldirir. Servis edilen dosyalara dokunmaz.
const stripOriginals = (mediaList, keys) => {
  let changed = false;
  const next = (Array.isArray(mediaList) ? mediaList : []).map((media) => {
    if (media?.original?.storageKey && keys.has(normalizeKey(media.original.storageKey))) {
      changed = true;
      const { original, ...rest } = media;
      return rest;
    }
    return media;
  });
  return { next, changed };
};

const stripOne = (media, keys) => {
  if (media?.original?.storageKey && keys.has(normalizeKey(media.original.storageKey))) {
    const { original, ...rest } = media;
    return { next: rest, changed: true };
  }
  return { next: media, changed: false };
};

const clearArchiveReferences = async (keys) => {
  let touched = 0;

  for (const doc of await Blog.find()) {
    const plain = doc.toObject();
    const cover = stripOne(plain.cover, keys);
    const assets = stripOriginals(plain.assets, keys);
    if (cover.changed || assets.changed) {
      if (cover.changed) doc.cover = cover.next;
      if (assets.changed) doc.assets = assets.next;
      await doc.save();
      touched += 1;
    }
  }

  for (const doc of await Journal.find()) {
    const plain = doc.toObject();
    const cover = stripOne(plain.cover, keys);
    const assets = stripOriginals(plain.assets, keys);
    if (cover.changed || assets.changed) {
      if (cover.changed) doc.cover = cover.next;
      if (assets.changed) doc.assets = assets.next;
      await doc.save();
      touched += 1;
    }
  }

  for (const doc of await Project.find()) {
    const plain = doc.toObject();
    const cover = stripOne(plain.cover, keys);
    const video = stripOne(plain.video, keys);
    const images = stripOriginals(plain.images, keys);
    if (cover.changed || video.changed || images.changed) {
      if (cover.changed) doc.cover = cover.next;
      if (video.changed) doc.video = video.next;
      if (images.changed) doc.images = images.next;
      await doc.save();
      touched += 1;
    }
  }

  for (const doc of await Service.find()) {
    const plain = doc.toObject();
    const cover = stripOne(plain.cover, keys);
    const images = stripOriginals(plain.images, keys);

    let subChanged = false;
    const nextSubs = (plain.subServices || []).map((sub) => {
      const subCover = stripOne(sub.cover, keys);
      const subImages = stripOriginals(sub.images, keys);
      if (!subCover.changed && !subImages.changed) return sub;
      subChanged = true;
      return { ...sub, cover: subCover.next, images: subImages.next };
    });

    if (cover.changed || images.changed || subChanged) {
      if (cover.changed) doc.cover = cover.next;
      if (images.changed) doc.images = images.next;
      if (subChanged) {
        doc.subServices = nextSubs;
        doc.markModified("subServices");
      }
      await doc.save();
      touched += 1;
    }
  }

  return touched;
};

exports.deleteArchives = async (req, res) => {
  try {
    const report = await buildStorageReport();
    const known = new Set(report.archives.map((a) => normalizeKey(a.storageKey)));

    const requested = req.body?.all
      ? [...known]
      : toKeyList(req.body).filter((key) => known.has(key));

    if (!requested.length) {
      return res.status(400).json({
        message: "Silinecek geçerli bir ham arşiv bulunamadı.",
      });
    }

    const keys = new Set(requested);
    const freed = report.archives
      .filter((a) => keys.has(normalizeKey(a.storageKey)))
      .reduce((sum, a) => sum + Number(a.bytes || 0), 0);

    // Once veritabani referansini kaldiriyoruz: dosya silinip kayit kalirsa
    // panel olmayan bir arsivi gostermeye devam ederdi.
    const touched = await clearArchiveReferences(keys);

    let deleted = 0;
    for (const key of keys) {
      try {
        await fs.unlink(resolveAbsolute(key));
        deleted += 1;
      } catch {
        /* dosya zaten yoksa sorun degil */
      }
    }

    res.json({
      message: `${deleted} ham arşiv silindi.`,
      deleted,
      updatedDocuments: touched,
      freedBytes: freed,
    });
  } catch (error) {
    res.status(500).json({
      message: "Arşivler silinemedi",
      error: error.message,
    });
  }
};

/* -------------------- Yetim dosya silme -------------------- */
exports.deleteOrphans = async (req, res) => {
  try {
    const report = await buildStorageReport();
    const known = new Set(report.orphans.map((o) => normalizeKey(o.key)));

    const requested = req.body?.all
      ? [...known]
      : toKeyList(req.body).filter((key) => known.has(key));

    if (!requested.length) {
      return res.status(400).json({
        message: "Silinecek geçerli bir yetim dosya bulunamadı.",
      });
    }

    const freed = report.orphans
      .filter((o) => requested.includes(normalizeKey(o.key)))
      .reduce((sum, o) => sum + Number(o.bytes || 0), 0);

    let deleted = 0;
    for (const key of requested) {
      // Ekstra guvenlik: yalnizca icerik klasorleri altindaki dosyalar.
      if (!isContentFile(key)) continue;
      try {
        await fs.unlink(resolveAbsolute(key));
        deleted += 1;
      } catch {
        /* zaten yok */
      }
    }

    res.json({
      message: `${deleted} yetim dosya silindi.`,
      deleted,
      freedBytes: freed,
    });
  } catch (error) {
    res.status(500).json({
      message: "Yetim dosyalar silinemedi",
      error: error.message,
    });
  }
};
