require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Blog = require("../models/Blog");
const Journal = require("../models/Journal");
const Project = require("../models/Project");
const Service = require("../models/Service");
const { refreshMediaDoc } = require("../storage");

const toPlain = (value) =>
  value && typeof value.toObject === "function" ? value.toObject() : value;

const serialize = (value) => JSON.stringify(value ?? null);

const refreshMediaValue = async (media) => {
  if (!media?.storageKey) return toPlain(media) || media || null;
  return refreshMediaDoc(toPlain(media));
};

const refreshMediaArray = async (items = []) => {
  const list = Array.isArray(items) ? items : [];
  return Promise.all(list.map((item) => refreshMediaValue(item)));
};

const processCursor = async (label, cursor, updater) => {
  let scanned = 0;
  let updated = 0;
  let failed = 0;

  for await (const doc of cursor) {
    scanned += 1;
    try {
      const changed = await updater(doc);
      if (changed) {
        await doc.save();
        updated += 1;
      }
    } catch (error) {
      failed += 1;
      console.error(`[${label}] ${doc._id} failed: ${error.message}`);
    }
  }

  console.log(`[${label}] scanned=${scanned} updated=${updated} failed=${failed}`);
};

const same = (a, b) => serialize(toPlain(a)) === serialize(toPlain(b));

const run = async () => {
  await connectDB();

  await processCursor("blogs", Blog.find().cursor(), async (doc) => {
    let changed = false;

    const nextCover = await refreshMediaValue(doc.cover);
    if (!same(doc.cover, nextCover)) {
      doc.cover = nextCover;
      changed = true;
    }

    const nextAssets = await refreshMediaArray(doc.assets);
    if (!same(doc.assets, nextAssets)) {
      doc.assets = nextAssets;
      changed = true;
    }

    return changed;
  });

  await processCursor("journals", Journal.find().cursor(), async (doc) => {
    let changed = false;

    const nextCover = await refreshMediaValue(doc.cover);
    if (!same(doc.cover, nextCover)) {
      doc.cover = nextCover;
      changed = true;
    }

    const nextAssets = await refreshMediaArray(doc.assets);
    if (!same(doc.assets, nextAssets)) {
      doc.assets = nextAssets;
      changed = true;
    }

    return changed;
  });

  await processCursor("projects", Project.find().cursor(), async (doc) => {
    let changed = false;

    const nextCover = await refreshMediaValue(doc.cover);
    if (!same(doc.cover, nextCover)) {
      doc.cover = nextCover;
      changed = true;
    }

    const nextVideo = doc.video ? await refreshMediaValue(doc.video) : doc.video;
    if (!same(doc.video, nextVideo)) {
      doc.video = nextVideo;
      changed = true;
    }

    const nextImages = await refreshMediaArray(doc.images);
    if (!same(doc.images, nextImages)) {
      doc.images = nextImages;
      changed = true;
    }

    return changed;
  });

  await processCursor("services", Service.find().cursor(), async (doc) => {
    let changed = false;

    const nextCover = await refreshMediaValue(doc.cover);
    if (!same(doc.cover, nextCover)) {
      doc.cover = nextCover;
      changed = true;
    }

    const nextImages = await refreshMediaArray(doc.images);
    if (!same(doc.images, nextImages)) {
      doc.images = nextImages;
      changed = true;
    }

    const nextSubServices = [];
    for (const subService of Array.isArray(doc.subServices) ? doc.subServices : []) {
      const nextSubCover = await refreshMediaValue(subService.cover);
      const nextSubImages = await refreshMediaArray(subService.images);
      nextSubServices.push({
        ...toPlain(subService),
        cover: nextSubCover,
        images: nextSubImages,
      });
    }

    if (!same(doc.subServices, nextSubServices)) {
      doc.subServices = nextSubServices;
      changed = true;
    }

    return changed;
  });

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
