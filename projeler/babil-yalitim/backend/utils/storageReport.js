const fs = require("fs/promises");
const os = require("os");
const path = require("path");

const Blog = require("../models/Blog");
const Journal = require("../models/Journal");
const Project = require("../models/Project");
const Service = require("../models/Service");
const { MEDIA_ROOT } = require("../storage");

/**
 * Medya klasorunu tarar ve veritabaniyla karsilastirir.
 *
 * Amac: admin panelinde "neyi silersem ne kadar yer acilir" sorusunu
 * guvenli sekilde cevaplayabilmek. Silinebilir olan yalnizca iki sey var:
 *   - ham arsivler (.original.*) : hicbir zaman servis edilmiyor
 *   - yetim dosyalar             : hicbir icerik tarafindan kullanilmiyor
 * Servis edilen dosyalar ve varyantlar bu raporda "korumali" isaretleniyor.
 */

// Dosya adi desenine gore siniflandirma. Depolama katmani bu son ekleri
// uretiyor; boylece storage/index.js'ten ek export gerekmiyor.
const CLASSIFIERS = [
  { type: "original", re: /\.original\.[^.]+$/i },
  { type: "poster", re: /\.poster\.jpe?g$/i },
  { type: "videoVariant", re: /\.(preview|detail)\.mp4$/i },
  { type: "imageVariant", re: /\.w\d+\.webp$/i },
];

// Icerik klasorleri. Bunlarin disinda kalan (kok seviyesindeki) dosyalar
// hero videosu gibi elle konmus sistem dosyalari; yetim sayilmazlar.
const CONTENT_ROOTS = new Set(["blogs", "journals", "projects", "services"]);

const classifyKey = (key) =>
  CLASSIFIERS.find((c) => c.re.test(key))?.type || "main";

const isContentFile = (key) => CONTENT_ROOTS.has(String(key).split("/")[0]);

const scanMediaFiles = async () => {
  const files = [];

  const walk = async (dir, rel = "") => {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const absolutePath = path.join(dir, entry.name);
      const key = rel ? `${rel}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await walk(absolutePath, key);
        continue;
      }

      try {
        const stat = await fs.stat(absolutePath);
        files.push({
          key,
          bytes: stat.size,
          type: classifyKey(key),
          modifiedAt: stat.mtime,
        });
      } catch {
        /* okunamayan dosyayi atla */
      }
    }
  };

  await walk(MEDIA_ROOT);
  return files;
};

/** Bir medya belgesinin tum dosya anahtarlarini toplar. */
const keysOfMedia = (media) => {
  if (!media?.storageKey) return [];
  const keys = [String(media.storageKey)];
  if (media.posterUrl) {
    const parsed = path.posix.parse(String(media.storageKey));
    keys.push(path.posix.join(parsed.dir, `${parsed.name}.poster.jpg`));
  }
  (media.variants || []).forEach((v) => {
    if (v?.storageKey) keys.push(String(v.storageKey));
  });
  if (media.original?.storageKey) keys.push(String(media.original.storageKey));
  return keys;
};

const mediaEntry = (media, label) => ({
  label,
  storageKey: String(media.storageKey || ""),
  resourceType: media.resourceType || "image",
  bytes: Number(media.bytes || 0),
  width: media.width,
  height: media.height,
  variantBytes: (media.variants || []).reduce(
    (sum, v) => sum + Number(v?.bytes || 0),
    0
  ),
  original: media.original?.storageKey
    ? {
        storageKey: String(media.original.storageKey),
        bytes: Number(media.original.bytes || 0),
        width: media.original.width,
        height: media.original.height,
      }
    : null,
});

/** Tum koleksiyonlardaki medyayi icerik bazinda toplar. */
const collectContentMedia = async () => {
  const items = [];

  const push = (kind, doc, mediaList) => {
    const entries = mediaList.filter(Boolean);
    if (!entries.length) return;
    items.push({
      kind,
      id: String(doc._id),
      title: String(doc.title || doc._id),
      updatedAt: doc.updatedAt,
      createdAt: doc.createdAt,
      media: entries,
    });
  };

  const arr = (v) => (Array.isArray(v) ? v : []);

  for (const doc of await Blog.find().lean()) {
    push("blog", doc, [
      doc.cover && mediaEntry(doc.cover, "Kapak"),
      ...arr(doc.assets).map((m, i) => m && mediaEntry(m, `Ek medya ${i + 1}`)),
    ]);
  }

  for (const doc of await Journal.find().lean()) {
    push("journal", doc, [
      doc.cover && mediaEntry(doc.cover, "Kapak"),
      ...arr(doc.assets).map((m, i) => m && mediaEntry(m, `Ek medya ${i + 1}`)),
    ]);
  }

  for (const doc of await Project.find().lean()) {
    push("project", doc, [
      doc.cover && mediaEntry(doc.cover, "Kapak"),
      doc.video && mediaEntry(doc.video, "Video"),
      ...arr(doc.images).map((m, i) => m && mediaEntry(m, `Görsel ${i + 1}`)),
    ]);
  }

  for (const doc of await Service.find().lean()) {
    const list = [
      doc.cover && mediaEntry(doc.cover, "Kapak"),
      ...arr(doc.images).map((m, i) => m && mediaEntry(m, `Galeri ${i + 1}`)),
    ];
    arr(doc.subServices).forEach((sub) => {
      const name = String(sub?.title || "Alt hizmet").slice(0, 40);
      if (sub?.cover) list.push(mediaEntry(sub.cover, `${name} — kapak`));
      arr(sub?.images).forEach((m, i) => {
        if (m) list.push(mediaEntry(m, `${name} — görsel ${i + 1}`));
      });
    });
    push("service", doc, list);
  }

  return items;
};

/**
 * Sunucunun anlik durumu.
 *
 * Bellekte os.freemem() kullanilmiyor: Linux'ta bu deger MemFree'yi doner ve
 * disk onbellegini "dolu" saydigi icin olduklen dusuk gorunur. Gercekte
 * kullanilabilir olan MemAvailable, o yuzden once /proc/meminfo okunuyor.
 */
const getSystemInfo = async () => {
  let disk = null;
  try {
    const stat = await fs.statfs(MEDIA_ROOT);
    const total = stat.blocks * stat.bsize;
    const free = stat.bavail * stat.bsize;
    disk = { total, free, used: total - free };
  } catch {
    /* statfs desteklenmiyorsa disk bilgisi atlanir */
  }

  const totalMem = os.totalmem();
  let availableMem = os.freemem();
  try {
    const meminfo = await fs.readFile("/proc/meminfo", "utf8");
    const match = meminfo.match(/^MemAvailable:\s+(\d+)\s+kB/m);
    if (match) availableMem = Number(match[1]) * 1024;
  } catch {
    /* Linux disi ortamda os.freemem() ile devam */
  }

  return {
    disk,
    memory: {
      total: totalMem,
      available: availableMem,
      used: Math.max(0, totalMem - availableMem),
    },
    cpuCount: os.cpus().length,
    loadAverage: os.loadavg(),
    uptimeSeconds: Math.round(os.uptime()),
  };
};

const buildStorageReport = async () => {
  const [files, items, system] = await Promise.all([
    scanMediaFiles(),
    collectContentMedia(),
    getSystemInfo(),
  ]);

  const referenced = new Set();
  items.forEach((item) =>
    item.media.forEach((m) =>
      keysOfMedia({
        storageKey: m.storageKey,
        posterUrl: m.resourceType === "video" ? "x" : "",
        variants: [],
        original: m.original,
      }).forEach((k) => referenced.add(k))
    )
  );

  // Varyant anahtarlari mediaEntry icinde tutulmadigi icin dosya adi
  // deseninden turetilen kardesleri de sahipli sayiyoruz.
  const mainKeys = new Set(
    items.flatMap((i) => i.media.map((m) => m.storageKey))
  );
  const belongsToKnownMain = (key) => {
    const parsed = path.posix.parse(key);
    const base = parsed.name
      .replace(/\.(original|poster|preview|detail)$/i, "")
      .replace(/\.w\d+$/i, "");
    for (const ext of [".mp4", ".mov", ".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"]) {
      if (mainKeys.has(path.posix.join(parsed.dir, `${base}${ext}`))) return true;
    }
    return false;
  };

  const totals = {
    total: 0,
    main: 0,
    imageVariant: 0,
    videoVariant: 0,
    poster: 0,
    original: 0,
    orphan: 0,
    system: 0,
  };
  const orphans = [];

  files.forEach((file) => {
    totals.total += file.bytes;

    if (!isContentFile(file.key)) {
      totals.system += file.bytes;
      return;
    }

    const owned = referenced.has(file.key) || belongsToKnownMain(file.key);
    if (!owned) {
      totals.orphan += file.bytes;
      orphans.push(file);
      return;
    }

    totals[file.type] = (totals[file.type] || 0) + file.bytes;
  });

  const archives = items.flatMap((item) =>
    item.media
      .filter((m) => m.original)
      .map((m) => ({
        kind: item.kind,
        contentId: item.id,
        contentTitle: item.title,
        label: m.label,
        storageKey: m.original.storageKey,
        bytes: m.original.bytes,
        width: m.original.width,
        height: m.original.height,
        servedBytes: m.bytes,
      }))
  );

  const byContent = items
    .map((item) => ({
      kind: item.kind,
      id: item.id,
      title: item.title,
      updatedAt: item.updatedAt,
      createdAt: item.createdAt,
      servedBytes: item.media.reduce(
        (s, m) => s + m.bytes + m.variantBytes,
        0
      ),
      archiveBytes: item.media.reduce(
        (s, m) => s + Number(m.original?.bytes || 0),
        0
      ),
      mediaCount: item.media.length,
    }))
    .sort((a, b) => b.servedBytes + b.archiveBytes - (a.servedBytes + a.archiveBytes));

  return {
    system,
    totals,
    reclaimable: totals.original + totals.orphan,
    fileCount: files.length,
    archives: archives.sort((a, b) => b.bytes - a.bytes),
    orphans: orphans.sort((a, b) => b.bytes - a.bytes),
    byContent,
  };
};

module.exports = {
  classifyKey,
  isContentFile,
  scanMediaFiles,
  collectContentMedia,
  getSystemInfo,
  buildStorageReport,
};
