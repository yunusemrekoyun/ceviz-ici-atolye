const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const sharp = require("sharp");
const multer = require("multer");
const { ffmpegPath, remuxVideoForStreaming } = require("../utils/ffmpeg");
const { buildMediaLimitSummary } = require("../utils/uploadErrors");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname || ""));
  },
});

const toPositiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const IMAGE_SOFT_LIMIT_MB = toPositiveNumber(
  process.env.IMAGE_UPLOAD_LIMIT_MB,
  20
);
const VIDEO_SOFT_LIMIT_MB = toPositiveNumber(
  process.env.VIDEO_UPLOAD_LIMIT_MB,
  50
);
const HARD_LIMIT_MB = toPositiveNumber(
  process.env.MAX_UPLOAD_ACCEPT_MB || process.env.MAX_VIDEO_SIZE_MB,
  200
);

const IMAGE_SOFT_LIMIT_BYTES = IMAGE_SOFT_LIMIT_MB * 1024 * 1024;
const VIDEO_SOFT_LIMIT_BYTES = VIDEO_SOFT_LIMIT_MB * 1024 * 1024;
const MULTER_LIMIT_BYTES = HARD_LIMIT_MB * 1024 * 1024;

const isImageMime = (mimetype = "") =>
  /^image\/(jpe?g|png|webp|gif|avif)$/i.test(mimetype);
const isVideoMime = (mimetype = "") =>
  /^video\/(mp4|quicktime|x-matroska|webm|x-msvideo)$/i.test(mimetype);

const videoMimeByExtension = {
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const getSoftLimitBytesForFile = (file) => {
  if (isImageMime(file?.mimetype)) return IMAGE_SOFT_LIMIT_BYTES;
  if (isVideoMime(file?.mimetype)) return VIDEO_SOFT_LIMIT_BYTES;
  return 0;
};

const getSoftLimitMbForFile = (file) => {
  if (isImageMime(file?.mimetype)) return IMAGE_SOFT_LIMIT_MB;
  if (isVideoMime(file?.mimetype)) return VIDEO_SOFT_LIMIT_MB;
  return 0;
};

const safeUnlink = async (targetPath) => {
  if (!targetPath) return;
  await fs.unlink(targetPath).catch(() => {});
};

const optimizeImageWithoutQualityDrop = async (file) => {
  const transformer = sharp(file.path, {
    animated: true,
    limitInputPixels: false,
  }).rotate();
  const mime = String(file.mimetype || "").toLowerCase();
  let outputPath = "";
  let outputMime = mime;

  switch (mime) {
    case "image/jpeg":
    case "image/jpg":
      outputPath = `${file.path}.optimized.jpg`;
      outputMime = "image/jpeg";
      await transformer
        .jpeg({
          quality: 100,
          mozjpeg: true,
          progressive: true,
          chromaSubsampling: "4:4:4",
        })
        .toFile(outputPath);
      break;
    case "image/png":
      outputPath = `${file.path}.optimized.png`;
      outputMime = "image/png";
      await transformer
        .png({
          compressionLevel: 9,
          adaptiveFiltering: true,
          palette: false,
        })
        .toFile(outputPath);
      break;
    case "image/webp":
      outputPath = `${file.path}.optimized.webp`;
      outputMime = "image/webp";
      await transformer.webp({ lossless: true, effort: 6 }).toFile(outputPath);
      break;
    case "image/avif":
      outputPath = `${file.path}.optimized.avif`;
      outputMime = "image/avif";
      await transformer.avif({ lossless: true, effort: 9 }).toFile(outputPath);
      break;
    case "image/gif":
      outputPath = `${file.path}.optimized.gif`;
      outputMime = "image/gif";
      await transformer.gif({ effort: 10 }).toFile(outputPath);
      break;
    default:
      return false;
  }

  const stat = await fs.stat(outputPath);
  if (stat.size >= file.size) {
    await safeUnlink(outputPath);
    return false;
  }

  await safeUnlink(file.path);
  file.path = outputPath;
  file.size = stat.size;
  file.filename = path.basename(outputPath);
  file.mimetype = outputMime;
  return true;
};

const optimizeVideoWithoutQualityDrop = async (file) => {
  if (!ffmpegPath) return false;

  const extension =
    path.extname(file.originalname || "").toLowerCase() ||
    path.extname(file.path || "").toLowerCase() ||
    ".mp4";
  const safeExtension =
    extension in videoMimeByExtension ? extension : path.extname(file.path || "") || ".mp4";
  const outputPath = `${file.path}.optimized${safeExtension}`;
  await remuxVideoForStreaming(file.path, outputPath, {
    stripMetadata: true,
    faststart: [".mp4", ".mov"].includes(safeExtension),
  });

  const stat = await fs.stat(outputPath);
  if (stat.size >= file.size) {
    await safeUnlink(outputPath);
    return false;
  }

  await safeUnlink(file.path);
  file.path = outputPath;
  file.size = stat.size;
  file.filename = path.basename(outputPath);
  file.mimetype = videoMimeByExtension[safeExtension] || "video/mp4";
  return true;
};

const cleanupUploadedFiles = async (files = []) => {
  await Promise.all(files.map((file) => safeUnlink(file?.path)));
};

const upload = multer({
  storage,
  limits: { fileSize: MULTER_LIMIT_BYTES },
  fileFilter: (_req, file, cb) => {
    const isImage = isImageMime(file.mimetype);
    const isVideo = isVideoMime(file.mimetype);
    if (!isImage && !isVideo) {
      const err = new Error(
        "Desteklenmeyen dosya türü. Görseller için JPG, PNG, WEBP, GIF, AVIF; videolar için MP4, MOV, MKV, WEBM ve AVI yükleyebilirsiniz."
      );
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
});

async function compressIfNeeded(req, res, next) {
  const files = req.files || {};
  const all = Array.isArray(files) ? files : Object.values(files).flat();

  const failed = [];

  for (const file of all) {
    if (!file) continue;
    const softLimitBytes = getSoftLimitBytesForFile(file);
    const softLimitMb = getSoftLimitMbForFile(file);

    if (!softLimitBytes || file.size <= softLimitBytes) continue;

    const isImage = isImageMime(file.mimetype || "");
    const isVideo = isVideoMime(file.mimetype || "");

    if (isImage) {
      try {
        await optimizeImageWithoutQualityDrop(file);
      } catch (err) {
        /* optimize edilemedi */
      }

      if (file.size > softLimitBytes) {
        failed.push(
          `${file.originalname || file.filename || "dosya"} (${softLimitMb}MB)`
        );
      }
      continue;
    }

    if (isVideo) {
      if (!ffmpegPath) {
        failed.push(
          `${file.originalname || file.filename || "video"} (${softLimitMb}MB)`
        );
        continue;
      }
      try {
        await optimizeVideoWithoutQualityDrop(file);
      } catch (err) {
        /* optimize edilemedi */
      }

      if (file.size > softLimitBytes) {
        failed.push(
          `${file.originalname || file.filename || "video"} (${softLimitMb}MB)`
        );
      }
      continue;
    }

    failed.push(file.originalname || file.filename || "dosya");
  }

  if (failed.length) {
    await cleanupUploadedFiles(all);
    return res.status(413).json({
      message:
        buildMediaLimitSummary({
          imageLimitMb: IMAGE_SOFT_LIMIT_MB,
          videoLimitMb: VIDEO_SOFT_LIMIT_MB,
        }) +
        " Kaliteyi düşürmeden optimize etmeyi denedik ancak yeterli olmadı: " +
        failed.join(", ") +
        ". Lütfen daha küçük boyutta bir medya yükleyin.",
    });
  }

  next();
}

module.exports = {
  upload,
  compressIfNeeded,
  IMAGE_SOFT_LIMIT_MB,
  VIDEO_SOFT_LIMIT_MB,
  HARD_LIMIT_MB,
};
