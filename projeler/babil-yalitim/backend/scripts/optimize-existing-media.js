/**
 * Halihazirda kayitli medyayi yeni pipeline kurallarina gore yerinde normalize eder.
 *
 * upload() yeni yuklemeler icin bu isi zaten yapiyor; bu script ayni islemi
 * daha once yuklenmis dosyalara uygular: ana dosyayi .original olarak arsivler,
 * yerine web surumunu (<=1080p, <=30fps) koyar, varyantlari ve posteri yeniler,
 * ardindan veritabani kaydini gunceller.
 *
 * Kullanim:
 *   node scripts/optimize-existing-media.js --dry            # rapor, hicbir sey yazilmaz
 *   node scripts/optimize-existing-media.js --limit=3        # sadece ilk 3 medya
 *   node scripts/optimize-existing-media.js                  # gercek calistirma
 *
 * MEDIA_ROOT ve MONGO_URI .env'den okunur; ikisini de gecici olarak
 * ortam degiskeniyle ezerek once test veritabaninda denemek onerilir.
 */
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Blog = require("../models/Blog");
const Journal = require("../models/Journal");
const Project = require("../models/Project");
const Service = require("../models/Service");
const {
  reprocessMedia,
  adoptMediaFromDisk,
  MEDIA_ROOT,
  MEDIA_BASE_URL,
} = require("../storage");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry");
// Medya baska bir makinede islenip yuklendiginde kullanilir: yeniden kodlama
// yapmadan veritabanini diskteki dosyalarin gercek haliyle esitler.
const ADOPT = args.includes("--adopt");
const LIMIT = (() => {
  const raw = args.find((a) => a.startsWith("--limit="));
  const parsed = raw ? Number.parseInt(raw.split("=")[1], 10) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
})();

const stats = {
  scanned: 0,
  processed: 0,
  skipped: 0,
  failed: 0,
  bytesBefore: 0,
  bytesAfter: 0,
};

const mb = (bytes) => (Number(bytes || 0) / 1048576).toFixed(2);
const toPlain = (value) =>
  value && typeof value.toObject === "function" ? value.toObject() : value;

const reachedLimit = () => LIMIT > 0 && stats.processed >= LIMIT;

/** Iki medya kaydinin anlamli alanlari ayni mi. */
const sameDoc = (a, b) => {
  const pick = (m) =>
    JSON.stringify({
      url: m?.url,
      bytes: m?.bytes,
      width: m?.width,
      height: m?.height,
      posterUrl: m?.posterUrl || "",
      variants: (m?.variants || []).map((v) => [v.label, v.storageKey, v.bytes, v.url]),
      original: m?.original ? [m.original.storageKey, m.original.bytes] : null,
    });
  return pick(a) === pick(b);
};

/** --adopt: diskteki gercek dosyalara gore kaydi esitler, transcode yok. */
const handleAdopt = async (media, label) => {
  try {
    const prev = toPlain(media);
    const next = await adoptMediaFromDisk(prev);

    if (!next) {
      stats.skipped += 1;
      console.log(`  [DOSYA YOK] ${label}`);
      return { next: media, changed: false };
    }

    if (sameDoc(prev, next)) {
      stats.skipped += 1;
      return { next: media, changed: false };
    }

    stats.processed += 1;
    stats.bytesBefore += Number(prev.bytes || 0);
    stats.bytesAfter += Number(next.bytes || 0);
    console.log(
      `  [esitlendi] ${mb(prev.bytes).padStart(6)} MB -> ${mb(next.bytes).padStart(6)} MB  ` +
        `arsiv:${next.original ? "VAR" : " - "}  varyant:${(next.variants || []).length}  ${label}`
    );

    return DRY_RUN
      ? { next: media, changed: false }
      : { next, changed: true };
  } catch (error) {
    stats.failed += 1;
    console.error(`  [HATA]      ${label}: ${error.message}`);
    return { next: media, changed: false };
  }
};

/** Tek bir medya alanini isler. Degisiklik yoksa orijinal degeri geri verir. */
const handleMedia = async (media, label) => {
  if (!media || reachedLimit()) return { next: media, changed: false };

  stats.scanned += 1;

  if (ADOPT) return handleAdopt(media, label);

  try {
    const result = await reprocessMedia(toPlain(media), { dryRun: DRY_RUN });

    if (!result) {
      stats.skipped += 1;
      return { next: media, changed: false };
    }

    const before = result.before || {};
    stats.bytesBefore += Number(before.bytes || 0);

    const desc =
      `${before.width}x${before.height}` +
      `${before.fps ? " @" + before.fps + "fps" : ""}` +
      `${before.durationSec ? " " + before.durationSec + "sn" : ""}` +
      `${before.bitrateMbps ? " " + before.bitrateMbps + "Mbps" : ""}`;

    if (DRY_RUN) {
      stats.processed += 1;
      console.log(
        `  [islenecek] ${mb(before.bytes).padStart(6)} MB  ${desc.padEnd(30)} ${label}`
      );
      return { next: media, changed: false };
    }

    stats.processed += 1;
    stats.bytesAfter += Number(result.bytes || 0);
    console.log(
      `  [islendi]   ${mb(before.bytes).padStart(6)} MB -> ${mb(result.bytes).padStart(6)} MB  ` +
        `${desc.padEnd(30)} ${label}`
    );

    const { before: _omit, ...next } = result;
    return { next, changed: true };
  } catch (error) {
    stats.failed += 1;
    console.error(`  [HATA]      ${label}: ${error.message}`);
    return { next: media, changed: false };
  }
};

const handleMediaArray = async (items, label) => {
  const list = Array.isArray(items) ? items : [];
  const next = [];
  let changed = false;

  for (let i = 0; i < list.length; i += 1) {
    const result = await handleMedia(list[i], `${label}[${i}]`);
    next.push(result.next);
    if (result.changed) changed = true;
  }

  return { next, changed };
};

const processCollection = async (name, cursor, updater) => {
  console.log(`\n=== ${name} ===`);
  let docs = 0;
  let saved = 0;

  for await (const doc of cursor) {
    if (reachedLimit()) break;
    docs += 1;

    try {
      const changed = await updater(doc);
      if (changed && !DRY_RUN) {
        await doc.save();
        saved += 1;
      }
    } catch (error) {
      stats.failed += 1;
      console.error(`  [HATA] ${name} ${doc._id}: ${error.message}`);
    }
  }

  console.log(`  ${name}: ${docs} dokuman tarandi, ${saved} kayit guncellendi`);
};

const run = async () => {
  console.log(
    `Mod: ${ADOPT ? "ADOPT (transcode yok, DB diskten esitlenir)" : "ISLEME"}` +
      ` | ${DRY_RUN ? "DRY-RUN (hicbir sey yazilmaz)" : "GERCEK CALISTIRMA"}` +
      `${LIMIT ? ` | limit: ${LIMIT} medya` : ""}`
  );
  console.log(`MEDIA_ROOT     : ${MEDIA_ROOT}`);
  console.log(
    `MEDIA_BASE_URL : ${MEDIA_BASE_URL || "(bos - goreli yol yazilacak)"}`
  );

  // Islenen her medyanin url alani MEDIA_BASE_URL'e gore yeniden yaziliyor.
  // Yerel bir adresle production veritabanina yazmak tum o medyayi siteden
  // dusurur; bu yuzden bilincli onay olmadan calistirmayi engelliyoruz.
  if (
    !DRY_RUN &&
    (!MEDIA_BASE_URL || /localhost|127\.0\.0\.1/i.test(MEDIA_BASE_URL)) &&
    !args.includes("--allow-local-urls")
  ) {
    console.error(
      "\nDURDURULDU: MEDIA_BASE_URL yerel bir adres (ya da bos).\n" +
        "Islenen kayitlarin url alanlari bu adrese gore yazilir.\n" +
        "  - Production icin  : MEDIA_BASE_URL=https://api.babilyalitim.com/media\n" +
        "  - Yerel test icin  : komuta --allow-local-urls ekleyin\n"
    );
    process.exit(1);
  }

  await connectDB();

  await processCollection("blogs", Blog.find().cursor(), async (doc) => {
    let changed = false;
    const title = String(doc.title || doc._id).slice(0, 30);

    const cover = await handleMedia(doc.cover, `${title} / cover`);
    if (cover.changed) {
      doc.cover = cover.next;
      changed = true;
    }

    const assets = await handleMediaArray(doc.assets, `${title} / assets`);
    if (assets.changed) {
      doc.assets = assets.next;
      changed = true;
    }

    return changed;
  });

  await processCollection("journals", Journal.find().cursor(), async (doc) => {
    let changed = false;
    const title = String(doc.title || doc._id).slice(0, 30);

    const cover = await handleMedia(doc.cover, `${title} / cover`);
    if (cover.changed) {
      doc.cover = cover.next;
      changed = true;
    }

    const assets = await handleMediaArray(doc.assets, `${title} / assets`);
    if (assets.changed) {
      doc.assets = assets.next;
      changed = true;
    }

    return changed;
  });

  await processCollection("projects", Project.find().cursor(), async (doc) => {
    let changed = false;
    const title = String(doc.title || doc._id).slice(0, 30);

    const cover = await handleMedia(doc.cover, `${title} / cover`);
    if (cover.changed) {
      doc.cover = cover.next;
      changed = true;
    }

    if (doc.video) {
      const video = await handleMedia(doc.video, `${title} / video`);
      if (video.changed) {
        doc.video = video.next;
        changed = true;
      }
    }

    const images = await handleMediaArray(doc.images, `${title} / images`);
    if (images.changed) {
      doc.images = images.next;
      changed = true;
    }

    return changed;
  });

  await processCollection("services", Service.find().cursor(), async (doc) => {
    let changed = false;
    const title = String(doc.title || doc._id).slice(0, 30);

    const cover = await handleMedia(doc.cover, `${title} / cover`);
    if (cover.changed) {
      doc.cover = cover.next;
      changed = true;
    }

    const images = await handleMediaArray(doc.images, `${title} / images`);
    if (images.changed) {
      doc.images = images.next;
      changed = true;
    }

    const subServices = Array.isArray(doc.subServices) ? doc.subServices : [];
    const nextSubServices = [];
    let subChanged = false;

    for (const subService of subServices) {
      const subTitle = String(subService.title || subService._id).slice(0, 24);
      const subCover = await handleMedia(
        subService.cover,
        `${title} / ${subTitle} / cover`
      );
      const subImages = await handleMediaArray(
        subService.images,
        `${title} / ${subTitle} / images`
      );

      if (subCover.changed || subImages.changed) subChanged = true;

      nextSubServices.push({
        ...toPlain(subService),
        cover: subCover.next,
        images: subImages.next,
      });
    }

    if (subChanged) {
      doc.subServices = nextSubServices;
      doc.markModified("subServices");
      changed = true;
    }

    return changed;
  });

  console.log("\n═══════════════ OZET ═══════════════");
  console.log(`  taranan medya   : ${stats.scanned}`);
  console.log(`  islenen         : ${stats.processed}`);
  console.log(`  atlanan         : ${stats.skipped}  (zaten uygun veya arsivi var)`);
  console.log(`  hatali          : ${stats.failed}`);

  if (!DRY_RUN && stats.processed) {
    const saved = stats.bytesBefore - stats.bytesAfter;
    console.log(
      `  servis edilen   : ${mb(stats.bytesBefore)} MB  ->  ${mb(stats.bytesAfter)} MB` +
        `  (${mb(saved)} MB azalma)`
    );
    console.log(
      `  not: ham dosyalar .original olarak arsivlendi, disk kullanimi dusmez.`
    );
  }

  if (DRY_RUN && stats.processed) {
    console.log(
      `  islenecek toplam: ${mb(stats.bytesBefore)} MB (servis edilen ana dosyalar)`
    );
  }

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
