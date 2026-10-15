const fs = require("fs/promises");
const path = require("path");
const { randomUUID } = require("crypto");
const sharp = require("sharp");
const {
  probeMedia,
  generateVideoPoster,
  remuxVideoForStreaming,
  transcodeVideoVariant,
} = require("../utils/ffmpeg");

const MEDIA_ROOT = path.resolve(
  process.env.MEDIA_ROOT || path.join(__dirname, "..", "media")
);
const MEDIA_PUBLIC_PATH = `/${String(
  process.env.MEDIA_PUBLIC_PATH || "media"
).replace(/^\/+|\/+$/g, "")}`;

const normalizeBaseUrl = (value = "") => String(value || "").replace(/\/+$/g, "");

const buildDefaultBaseUrl = () => {
  const baseUrl = normalizeBaseUrl(process.env.BASE_URL || "");
  if (!baseUrl) return "";
  return `${baseUrl}${MEDIA_PUBLIC_PATH}`;
};

const MEDIA_BASE_URL = normalizeBaseUrl(
  process.env.MEDIA_BASE_URL || buildDefaultBaseUrl()
);
const IMAGE_VARIANT_WIDTHS = String(
  process.env.MEDIA_IMAGE_VARIANT_WIDTHS || "480,960,1600"
)
  .split(",")
  .map((value) => Number(value.trim()))
  .filter(
    (value, index, list) =>
      Number.isFinite(value) && value > 0 && list.indexOf(value) === index
  )
  .sort((a, b) => a - b);
const IMAGE_VARIANT_QUALITY = Number(
  process.env.MEDIA_IMAGE_VARIANT_QUALITY || 82
);
const VIDEO_PREVIEW_MAX_EDGE = Number(
  process.env.MEDIA_VIDEO_PREVIEW_MAX_EDGE || 960
);
const VIDEO_DETAIL_MAX_EDGE = Number(
  process.env.MEDIA_VIDEO_DETAIL_MAX_EDGE || 1440
);
const VIDEO_PREVIEW_CRF = Number(
  process.env.MEDIA_VIDEO_PREVIEW_CRF || 32
);
const VIDEO_DETAIL_CRF = Number(
  process.env.MEDIA_VIDEO_DETAIL_CRF || 23
);
const VIDEO_PREVIEW_WITH_AUDIO = /^(1|true|yes)$/i.test(
  String(process.env.MEDIA_VIDEO_PREVIEW_WITH_AUDIO || "0")
);
const VIDEO_AUDIO_BITRATE = String(
  process.env.MEDIA_VIDEO_AUDIO_BITRATE || "128k"
).trim();

// Servis edilen ana dosyanın sınırları. Ham yükleme bunların üstündeyse
// yeniden kodlanır ve orijinali `original` alanında arşivlenir.
// Telefon kayıtları çoğunlukla 60 fps geldiği için asıl kazanç fps sınırında.
const VIDEO_WEB_MAX_EDGE = Number(process.env.MEDIA_VIDEO_WEB_MAX_EDGE || 1920);
const VIDEO_WEB_CRF = Number(process.env.MEDIA_VIDEO_WEB_CRF || 28);
const VIDEO_MAX_FPS = Number(process.env.MEDIA_VIDEO_MAX_FPS || 30);
const IMAGE_WEB_MAX_WIDTH = Number(
  process.env.MEDIA_IMAGE_WEB_MAX_WIDTH || 2560
);
const IMAGE_WEB_QUALITY = Number(process.env.MEDIA_IMAGE_WEB_QUALITY || 90);
// Cozunurluk ve fps uygun olsa bile asiri bitrate'li ya da cok buyuk dosyalar
// yeniden kodlanir: uzun cekimler ve kotu encode edilmis kayitlar boyle yakalanir.
const VIDEO_WEB_MAX_BITRATE = Number(
  process.env.MEDIA_VIDEO_WEB_MAX_BITRATE_MBPS || 2.5
);
// Mutlak boyut kurali varsayilan olarak kapali (0). Uzun ama verimli kodlanmis
// videolarda boyut sureden geliyor; yeniden kodlamak ya kazandirmiyor ya da
// kaliteyi dusuruyor. Bitrate kurali asiri kodlanmis dosyalari zaten yakaliyor.
const VIDEO_WEB_MAX_BYTES =
  Number(process.env.MEDIA_VIDEO_WEB_MAX_MB || 0) * 1024 * 1024;
// CRF ile kazanc saglanamayan kaynaklarda kullanilan hedef bitrate katsayisi.
// kbps = genislik * yukseklik * fps * katsayi / 1000
const VIDEO_BITRATE_FACTOR = Number(
  process.env.MEDIA_VIDEO_BITRATE_FACTOR || 0.04
);

const estimateWebBitrateKbps = (width, height, fps) => {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  const f = Number(fps) || 30;
  if (!w || !h) return 0;
  const kbps = Math.round((w * h * f * VIDEO_BITRATE_FACTOR) / 1000);
  return Math.min(Math.max(kbps, 300), 4000);
};

const normalizePathPart = (value = "") =>
  String(value || "")
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");

const inferTypeFromFile = (file, forceType) => {
  if (forceType === "image" || forceType === "video") return forceType;
  return /^video\//i.test(file?.mimetype || "") ? "video" : "image";
};

const inferExtension = (file, resourceType) => {
  const originalExt = path.extname(file?.originalname || file?.path || "").toLowerCase();
  if (originalExt) return originalExt;
  if (resourceType === "video") return ".mp4";
  return ".jpg";
};

const encodeStorageKey = (storageKey = "") =>
  normalizePathPart(storageKey)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

const buildMediaUrl = (storageKey = "") => {
  const encoded = encodeStorageKey(storageKey);
  if (!encoded) return "";
  if (MEDIA_BASE_URL) {
    return `${MEDIA_BASE_URL}/${encoded}`;
  }
  return `${MEDIA_PUBLIC_PATH}/${encoded}`;
};

const getImageVariantStorageKey = (storageKey = "", width, format = "webp") => {
  const normalized = normalizePathPart(storageKey);
  if (!normalized || !width) return "";
  const parsed = path.posix.parse(normalized);
  return path.posix.join(parsed.dir, `${parsed.name}.w${width}.${format}`);
};

const resolveAbsolutePath = (storageKey = "") =>
  path.join(MEDIA_ROOT, ...normalizePathPart(storageKey).split("/"));

const ensureDir = async (absoluteFilePath) => {
  await fs.mkdir(path.dirname(absoluteFilePath), { recursive: true });
};

const safeUnlink = async (absoluteFilePath) => {
  if (!absoluteFilePath) return;
  await fs.unlink(absoluteFilePath).catch(() => {});
};

const moveOrWriteFile = async (file, absoluteFilePath) => {
  await ensureDir(absoluteFilePath);

  if (file?.buffer) {
    await fs.writeFile(absoluteFilePath, file.buffer);
    return;
  }

  if (!file?.path) {
    throw new Error("Yükleme için geçerli bir medya dosyası bulunamadı.");
  }

  try {
    await fs.rename(file.path, absoluteFilePath);
  } catch (error) {
    if (error?.code !== "EXDEV") {
      throw error;
    }

    await fs.copyFile(file.path, absoluteFilePath);
    await fs.unlink(file.path).catch(() => {});
  }
};

const getPosterStorageKey = (storageKey = "") => {
  const normalized = normalizePathPart(storageKey);
  if (!normalized) return "";
  const parsed = path.posix.parse(normalized);
  return path.posix.join(parsed.dir, `${parsed.name}.poster.jpg`);
};

const getOriginalStorageKey = (storageKey = "") => {
  const normalized = normalizePathPart(storageKey);
  if (!normalized) return "";
  const parsed = path.posix.parse(normalized);
  return path.posix.join(parsed.dir, `${parsed.name}.original${parsed.ext}`);
};

const getVideoVariantStorageKey = (storageKey = "", label, format = "mp4") => {
  const normalized = normalizePathPart(storageKey);
  if (!normalized || !label) return "";
  const parsed = path.posix.parse(normalized);
  return path.posix.join(parsed.dir, `${parsed.name}.${label}.${format}`);
};

const prepareVideoForDelivery = async (absoluteFilePath) => {
  const extension = path.extname(absoluteFilePath || "").toLowerCase();
  if (![".mp4", ".mov"].includes(extension)) {
    return false;
  }

  const tempOutputPath = `${absoluteFilePath}.faststart${extension}`;

  try {
    await remuxVideoForStreaming(absoluteFilePath, tempOutputPath, {
      faststart: true,
    });
    await safeUnlink(absoluteFilePath);
    await fs.rename(tempOutputPath, absoluteFilePath);
    return true;
  } catch {
    await safeUnlink(tempOutputPath);
    return false;
  }
};

const parseFrameRate = (value = "") => {
  const [numerator, denominator = "1"] = String(value || "").split("/");
  const num = Number(numerator);
  const den = Number(denominator);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return 0;
  const fps = num / den;
  return Number.isFinite(fps) && fps > 0 ? fps : 0;
};

const extractVideoMeta = async (absoluteFilePath) => {
  const probe = await probeMedia(absoluteFilePath);
  const stream =
    (probe.streams || []).find((item) => item.codec_type === "video") || {};
  const format = probe.format || {};

  return {
    width: Number(stream.width) || undefined,
    height: Number(stream.height) || undefined,
    fps:
      parseFrameRate(stream.avg_frame_rate) ||
      parseFrameRate(stream.r_frame_rate) ||
      0,
    duration:
      Number(stream.duration) || Number(format.duration) || undefined,
    format:
      String(
        stream.codec_name ||
          format.format_name ||
          path.extname(absoluteFilePath).replace(/^\./, "")
      ).split(",")[0] || undefined,
  };
};

const getVideoScaleSize = ({ width, height, maxEdge }) => {
  const safeWidth = Number(width) || 0;
  const safeHeight = Number(height) || 0;
  const safeMaxEdge = Number(maxEdge) || 0;

  if (!safeWidth || !safeHeight || !safeMaxEdge) return "";
  if (Math.max(safeWidth, safeHeight) <= safeMaxEdge) return "";

  return safeWidth >= safeHeight ? `${safeMaxEdge}x?` : `?x${safeMaxEdge}`;
};

const buildImageDoc = async (absoluteFilePath, storageKey) => {
  const metadata = await sharp(absoluteFilePath).metadata();
  const stat = await fs.stat(absoluteFilePath);
  const variants = await buildImageVariants(absoluteFilePath, storageKey, metadata);

  return {
    url: buildMediaUrl(storageKey),
    storageKey,
    posterUrl: "",
    resourceType: "image",
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    bytes: stat.size,
    duration: undefined,
    variants,
  };
};

const buildVideoVariants = async (absoluteFilePath, storageKey, metadata = {}) => {
  const width = Number(metadata.width) || 0;
  const height = Number(metadata.height) || 0;
  if (!width || !height) return [];

  const plans = [
    {
      label: "preview",
      maxEdge: VIDEO_PREVIEW_MAX_EDGE,
      crf: VIDEO_PREVIEW_CRF,
      includeAudio: VIDEO_PREVIEW_WITH_AUDIO,
    },
    {
      label: "detail",
      maxEdge: VIDEO_DETAIL_MAX_EDGE,
      crf: VIDEO_DETAIL_CRF,
      includeAudio: true,
    },
  ].filter((plan) => Number(plan.maxEdge) > 0);

  const variants = [];
  const createdVariantPaths = [];

  try {
    for (const plan of plans) {
      const size = getVideoScaleSize({
        width,
        height,
        maxEdge: plan.maxEdge,
      });
      if (!size) continue;

      const variantStorageKey = getVideoVariantStorageKey(storageKey, plan.label);
      const absoluteVariantPath = resolveAbsolutePath(variantStorageKey);

      await ensureDir(absoluteVariantPath);
      await transcodeVideoVariant(absoluteFilePath, absoluteVariantPath, {
        size,
        crf: plan.crf,
        includeAudio: plan.includeAudio,
        audioBitrate: VIDEO_AUDIO_BITRATE,
        fps: Number(metadata.fps) > VIDEO_MAX_FPS ? VIDEO_MAX_FPS : 0,
      });
      createdVariantPaths.push(absoluteVariantPath);

      const variantMeta = await extractVideoMeta(absoluteVariantPath);
      const stat = await fs.stat(absoluteVariantPath);

      variants.push({
        label: plan.label,
        url: buildMediaUrl(variantStorageKey),
        storageKey: variantStorageKey,
        format: "mp4",
        width: variantMeta.width,
        height: variantMeta.height,
        bytes: stat.size,
      });
    }
  } catch (error) {
    await Promise.all(createdVariantPaths.map((targetPath) => safeUnlink(targetPath)));
    throw error;
  }

  return variants.sort((a, b) => (a.width || 0) - (b.width || 0));
};

const buildVideoDoc = async (absoluteFilePath, storageKey) => {
  await prepareVideoForDelivery(absoluteFilePath);
  const stat = await fs.stat(absoluteFilePath);
  const metadata = await extractVideoMeta(absoluteFilePath);
  const variants = await buildVideoVariants(absoluteFilePath, storageKey, metadata);
  const posterStorageKey = getPosterStorageKey(storageKey);
  const absolutePosterPath = resolveAbsolutePath(posterStorageKey);
  let posterCreated = false;

  try {
    await ensureDir(absolutePosterPath);
    await generateVideoPoster(absoluteFilePath, absolutePosterPath);
    posterCreated = true;
  } catch {
    await fs.unlink(absolutePosterPath).catch(() => {});
  }

  return {
    url: buildMediaUrl(storageKey),
    storageKey,
    posterUrl: posterCreated ? buildMediaUrl(posterStorageKey) : "",
    resourceType: "video",
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    bytes: stat.size,
    duration: metadata.duration,
    variants,
  };
};

const buildImageVariants = async (absoluteFilePath, storageKey, metadata = {}) => {
  const originalWidth = Number(metadata.width) || 0;
  const originalHeight = Number(metadata.height) || 0;
  const isAnimated = Number(metadata.pages || 0) > 1;

  if (!originalWidth || !originalHeight || isAnimated) {
    return [];
  }

  const widths = IMAGE_VARIANT_WIDTHS.filter((width) => width < originalWidth);
  if (!widths.length) {
    return [];
  }

  const variants = [];
  const createdVariantPaths = [];

  try {
    for (const width of widths) {
      const variantStorageKey = getImageVariantStorageKey(storageKey, width, "webp");
      const absoluteVariantPath = resolveAbsolutePath(variantStorageKey);

      await ensureDir(absoluteVariantPath);
      await sharp(absoluteFilePath, {
        animated: false,
        limitInputPixels: false,
      })
        .rotate()
        .resize({
          width,
          withoutEnlargement: true,
          fit: "inside",
        })
        .webp({
          quality: IMAGE_VARIANT_QUALITY,
          effort: 4,
        })
        .toFile(absoluteVariantPath);

      createdVariantPaths.push(absoluteVariantPath);

      const variantMeta = await sharp(absoluteVariantPath).metadata();
      const stat = await fs.stat(absoluteVariantPath);

      variants.push({
        label: `w${width}`,
        url: buildMediaUrl(variantStorageKey),
        storageKey: variantStorageKey,
        format: variantMeta.format || "webp",
        width: variantMeta.width,
        height: variantMeta.height,
        bytes: stat.size,
      });
    }
  } catch (error) {
    await Promise.all(createdVariantPaths.map((targetPath) => safeUnlink(targetPath)));
    throw error;
  }

  return variants;
};

// Bir videonun web surumu icin ne yapilmasi gerektigini belirler.
// Dort olcut: cozunurluk, kare hizi, bitrate ve mutlak dosya boyutu.
const planVideoWebVersion = async (absoluteFilePath) => {
  const meta = await extractVideoMeta(absoluteFilePath);
  const stat = await fs.stat(absoluteFilePath);
  const size = getVideoScaleSize({
    width: meta.width,
    height: meta.height,
    maxEdge: VIDEO_WEB_MAX_EDGE,
  });
  const fps = Number(meta.fps) > VIDEO_MAX_FPS ? VIDEO_MAX_FPS : 0;
  const duration = Number(meta.duration) || 0;
  const bitrateMbps = duration ? (stat.size * 8) / (duration * 1e6) : 0;

  const needsWork =
    Boolean(size) ||
    Boolean(fps) ||
    (VIDEO_WEB_MAX_BITRATE > 0 && bitrateMbps > VIDEO_WEB_MAX_BITRATE) ||
    (VIDEO_WEB_MAX_BYTES > 0 && stat.size > VIDEO_WEB_MAX_BYTES);

  return { needsWork, size, fps, meta, bytes: stat.size, bitrateMbps };
};

// Ham videoyu servis edilebilir bir web sürümüne indirger.
// Kaynak zaten sınırların içindeyse hiç yeniden kodlamaz ve false döner.
const normalizeVideoToWeb = async (sourcePath, targetPath) => {
  const { needsWork, size, fps } = await planVideoWebVersion(sourcePath);

  if (!needsWork) return false;

  await ensureDir(targetPath);
  await transcodeVideoVariant(sourcePath, targetPath, {
    size,
    crf: VIDEO_WEB_CRF,
    fps,
    includeAudio: true,
    audioBitrate: VIDEO_AUDIO_BITRATE,
  });

  // CRF bir kalite hedefi, boyut hedefi degil: zaten verimli kodlanmis ya da
  // gurultulu bir kaynakta cikti daha buyuk cikabiliyor.
  const sourceStat = await fs.stat(sourcePath);
  let outputStat = await fs.stat(targetPath);
  if (outputStat.size < sourceStat.size) return true;

  // CRF kazandirmadi. Cozunurluge gore hesaplanan hedef bitrate ile tekrar
  // deniyoruz; bu boyutu garanti altina aliyor.
  const outputMeta = await extractVideoMeta(targetPath);
  const targetKbps = estimateWebBitrateKbps(
    outputMeta.width,
    outputMeta.height,
    outputMeta.fps || fps || 30
  );

  if (!targetKbps) {
    await safeUnlink(targetPath);
    return false;
  }

  await transcodeVideoVariant(sourcePath, targetPath, {
    size,
    fps,
    includeAudio: true,
    audioBitrate: VIDEO_AUDIO_BITRATE,
    bitrateKbps: targetKbps,
  });

  outputStat = await fs.stat(targetPath);
  if (outputStat.size >= sourceStat.size) {
    await safeUnlink(targetPath);
    return false;
  }

  return true;
};

const normalizeImageToWeb = async (sourcePath, targetPath) => {
  const meta = await sharp(sourcePath).metadata();
  const isAnimated = Number(meta.pages || 0) > 1;

  if (isAnimated || !meta.width || meta.width <= IMAGE_WEB_MAX_WIDTH) {
    return false;
  }

  await ensureDir(targetPath);
  const pipeline = sharp(sourcePath, { limitInputPixels: false })
    .rotate()
    .resize({
      width: IMAGE_WEB_MAX_WIDTH,
      withoutEnlargement: true,
      fit: "inside",
    });

  switch (String(meta.format || "").toLowerCase()) {
    case "png":
      await pipeline.png({ compressionLevel: 9 }).toFile(targetPath);
      break;
    case "webp":
      await pipeline.webp({ quality: IMAGE_WEB_QUALITY }).toFile(targetPath);
      break;
    case "avif":
      await pipeline.avif({ quality: IMAGE_WEB_QUALITY }).toFile(targetPath);
      break;
    default:
      await pipeline
        .jpeg({ quality: IMAGE_WEB_QUALITY, mozjpeg: true })
        .toFile(targetPath);
  }

  // Videoda oldugu gibi: kazanc yoksa kaynagi oldugu gibi birak.
  const [sourceStat, outputStat] = await Promise.all([
    fs.stat(sourcePath),
    fs.stat(targetPath),
  ]);
  if (outputStat.size >= sourceStat.size) {
    await safeUnlink(targetPath);
    return false;
  }

  return true;
};

const buildOriginalMeta = async (absolutePath, storageKey, resourceType) => {
  const stat = await fs.stat(absolutePath);

  if (resourceType === "video") {
    const meta = await extractVideoMeta(absolutePath);
    return {
      storageKey,
      format: meta.format,
      width: meta.width,
      height: meta.height,
      bytes: stat.size,
      duration: meta.duration,
    };
  }

  const meta = await sharp(absolutePath).metadata();
  return {
    storageKey,
    format: meta.format,
    width: meta.width,
    height: meta.height,
    bytes: stat.size,
  };
};

const upload = async (file, { folder = "uploads", resourceType = "auto" } = {}) => {
  const normalizedFolder = normalizePathPart(folder);
  const detectedType = inferTypeFromFile(file, resourceType);
  const extension = inferExtension(file, detectedType);
  const storageKey = [normalizedFolder, `${Date.now()}-${randomUUID()}${extension}`]
    .filter(Boolean)
    .join("/");
  const originalStorageKey = getOriginalStorageKey(storageKey);
  const absoluteFilePath = resolveAbsolutePath(storageKey);
  const absoluteOriginalPath = resolveAbsolutePath(originalStorageKey);

  try {
    // Ham dosya önce "original" adıyla yerleşiyor; web sürümü ondan üretiliyor.
    await moveOrWriteFile(file, absoluteOriginalPath);

    let normalized = false;
    try {
      normalized =
        detectedType === "video"
          ? await normalizeVideoToWeb(absoluteOriginalPath, absoluteFilePath)
          : await normalizeImageToWeb(absoluteOriginalPath, absoluteFilePath);
    } catch {
      // Normalize edilemediyse yükleme başarısız sayılmaz; ham dosya
      // olduğu gibi servis edilir. Yarım kalan çıktı temizlenir.
      await safeUnlink(absoluteFilePath);
      normalized = false;
    }

    let original;
    if (normalized) {
      original = await buildOriginalMeta(
        absoluteOriginalPath,
        originalStorageKey,
        detectedType
      );
    } else {
      // Yeniden kodlamaya gerek yoktu; ham dosyanın kendisi web sürümü oluyor.
      await ensureDir(absoluteFilePath);
      await fs.rename(absoluteOriginalPath, absoluteFilePath);
    }

    const doc =
      detectedType === "video"
        ? await buildVideoDoc(absoluteFilePath, storageKey)
        : await buildImageDoc(absoluteFilePath, storageKey);

    return original ? { ...doc, original } : doc;
  } catch (error) {
    await safeUnlink(absoluteFilePath);
    await safeUnlink(absoluteOriginalPath);
    const posterStorageKey = getPosterStorageKey(storageKey);
    if (posterStorageKey) {
      await safeUnlink(resolveAbsolutePath(posterStorageKey));
    }
    throw error;
  }
};

const getMediaKey = (media = {}) => normalizePathPart(media?.storageKey || "");

const destroy = async (media) => {
  const storageKey = getMediaKey(media);
  if (!storageKey) return;

  const targets = [storageKey];
  if ((media?.resourceType || "image") === "video") {
    targets.push(getPosterStorageKey(storageKey));
  }
  if (media?.original?.storageKey) {
    targets.push(normalizePathPart(media.original.storageKey));
  }
  if (Array.isArray(media?.variants)) {
    media.variants.forEach((variant) => {
      const key = normalizePathPart(variant?.storageKey || "");
      if (key) targets.push(key);
    });
  }

  await Promise.all(
    targets
      .filter(Boolean)
      .map((key) => fs.unlink(resolveAbsolutePath(key)).catch(() => {}))
  );
};

const refreshMediaDoc = async (media) => {
  const normalizedMedia = media?.toObject?.() || media;
  const storageKey = getMediaKey(normalizedMedia);
  if (!storageKey) return normalizedMedia || null;

  const absoluteFilePath = resolveAbsolutePath(storageKey);
  const resourceType = normalizedMedia?.resourceType || "image";

  const doc =
    resourceType === "video"
      ? await buildVideoDoc(absoluteFilePath, storageKey)
      : await buildImageDoc(absoluteFilePath, storageKey);

  // Arşivlenmiş ham dosya kaydı yeniden üretilmez, olduğu gibi taşınır.
  return normalizedMedia?.original
    ? { ...doc, original: normalizedMedia.original }
    : doc;
};

const fileExists = async (absolutePath) =>
  fs
    .access(absolutePath)
    .then(() => true)
    .catch(() => false);

// Diskteki dosyalari okuyup medya kaydini yeniden kurar. Yeniden kodlama YAPMAZ.
// Medya baska bir makinede islenip sunucuya yuklendiginde, veritabanini
// dosyalarin gercek haliyle esitlemek icin kullanilir: boyutlar, varyantlar,
// poster ve varsa arsivlenmis ham dosya diskten tespit edilir.
const adoptMediaFromDisk = async (media) => {
  const normalized = media?.toObject?.() || media;
  const storageKey = getMediaKey(normalized);
  if (!storageKey) return null;

  const absoluteFilePath = resolveAbsolutePath(storageKey);
  if (!(await fileExists(absoluteFilePath))) return null;

  const resourceType = normalized?.resourceType || "image";
  const stat = await fs.stat(absoluteFilePath);
  const doc = {
    url: buildMediaUrl(storageKey),
    storageKey,
    resourceType,
    posterUrl: "",
    bytes: stat.size,
    variants: [],
  };

  if (resourceType === "video") {
    const meta = await extractVideoMeta(absoluteFilePath);
    Object.assign(doc, {
      format: meta.format,
      width: meta.width,
      height: meta.height,
      duration: meta.duration,
    });

    const posterKey = getPosterStorageKey(storageKey);
    if (await fileExists(resolveAbsolutePath(posterKey))) {
      doc.posterUrl = buildMediaUrl(posterKey);
    }

    for (const label of ["preview", "detail"]) {
      const variantKey = getVideoVariantStorageKey(storageKey, label);
      const variantPath = resolveAbsolutePath(variantKey);
      if (!(await fileExists(variantPath))) continue;

      const variantMeta = await extractVideoMeta(variantPath);
      const variantStat = await fs.stat(variantPath);
      doc.variants.push({
        label,
        url: buildMediaUrl(variantKey),
        storageKey: variantKey,
        format: "mp4",
        width: variantMeta.width,
        height: variantMeta.height,
        bytes: variantStat.size,
      });
    }
  } else {
    const meta = await sharp(absoluteFilePath).metadata();
    Object.assign(doc, {
      format: meta.format,
      width: meta.width,
      height: meta.height,
    });

    for (const width of IMAGE_VARIANT_WIDTHS) {
      const variantKey = getImageVariantStorageKey(storageKey, width, "webp");
      const variantPath = resolveAbsolutePath(variantKey);
      if (!(await fileExists(variantPath))) continue;

      const variantMeta = await sharp(variantPath).metadata();
      const variantStat = await fs.stat(variantPath);
      doc.variants.push({
        label: `w${width}`,
        url: buildMediaUrl(variantKey),
        storageKey: variantKey,
        format: variantMeta.format || "webp",
        width: variantMeta.width,
        height: variantMeta.height,
        bytes: variantStat.size,
      });
    }
  }

  const originalKey = getOriginalStorageKey(storageKey);
  const originalPath = resolveAbsolutePath(originalKey);
  if (await fileExists(originalPath)) {
    doc.original = await buildOriginalMeta(
      originalPath,
      originalKey,
      resourceType
    );
  }

  return doc;
};

// Halihazirda kayitli bir medyayi yerinde normalize eder.
// upload() yeni dosya icin calisirken bu, mevcut dosyalar icin ayni isi yapar:
// ana dosyayi .original olarak arsivler, yerine web surumu koyar, varyantlari yeniler.
// Yapacak bir sey yoksa null doner. Zaten islenmis kayitlar (original alani olanlar) atlanir.
const reprocessMedia = async (media, { dryRun = false } = {}) => {
  const normalizedMedia = media?.toObject?.() || media;
  const storageKey = getMediaKey(normalizedMedia);
  if (!storageKey || normalizedMedia?.original) return null;

  const resourceType = normalizedMedia?.resourceType || "image";
  const absoluteFilePath = resolveAbsolutePath(storageKey);
  const originalStorageKey = getOriginalStorageKey(storageKey);
  const absoluteOriginalPath = resolveAbsolutePath(originalStorageKey);

  const statBefore = await fs.stat(absoluteFilePath);
  let before;
  let needsWork = false;

  if (resourceType === "video") {
    const plan = await planVideoWebVersion(absoluteFilePath);
    needsWork = plan.needsWork;
    before = {
      width: plan.meta.width,
      height: plan.meta.height,
      fps: Math.round(Number(plan.meta.fps) || 0),
      bytes: plan.bytes,
      bitrateMbps: Number(plan.bitrateMbps.toFixed(1)),
      durationSec: Math.round(Number(plan.meta.duration) || 0),
    };
  } else {
    const meta = await sharp(absoluteFilePath).metadata();
    needsWork =
      Number(meta.pages || 0) <= 1 &&
      Number(meta.width) > IMAGE_WEB_MAX_WIDTH;
    before = {
      width: meta.width,
      height: meta.height,
      bytes: statBefore.size,
    };
  }

  if (!needsWork) return null;
  if (dryRun) return { dryRun: true, storageKey, resourceType, before };

  // Ana dosyayi arsive tasi; yeni web surumu onun yerine gelecek.
  await ensureDir(absoluteOriginalPath);
  await fs.rename(absoluteFilePath, absoluteOriginalPath);

  try {
    const normalized =
      resourceType === "video"
        ? await normalizeVideoToWeb(absoluteOriginalPath, absoluteFilePath)
        : await normalizeImageToWeb(absoluteOriginalPath, absoluteFilePath);

    if (!normalized) {
      // Beklenmedik durum: olcume gore gerekliydi ama uretilemedi. Geri al.
      await fs.rename(absoluteOriginalPath, absoluteFilePath);
      return null;
    }

    const doc =
      resourceType === "video"
        ? await buildVideoDoc(absoluteFilePath, storageKey)
        : await buildImageDoc(absoluteFilePath, storageKey);

    const original = await buildOriginalMeta(
      absoluteOriginalPath,
      originalStorageKey,
      resourceType
    );

    return { ...doc, original, before };
  } catch (error) {
    // Yarim kalan cikti temizlenir ve ana dosya eski yerine dondurulur.
    await safeUnlink(absoluteFilePath);
    await fs.rename(absoluteOriginalPath, absoluteFilePath).catch(() => {});
    throw error;
  }
};

module.exports = {
  MEDIA_ROOT,
  MEDIA_PUBLIC_PATH,
  MEDIA_BASE_URL,
  buildMediaUrl,
  getMediaKey,
  getImageVariantStorageKey,
  getPosterStorageKey,
  getOriginalStorageKey,
  refreshMediaDoc,
  reprocessMedia,
  adoptMediaFromDisk,
  upload,
  destroy,
};
