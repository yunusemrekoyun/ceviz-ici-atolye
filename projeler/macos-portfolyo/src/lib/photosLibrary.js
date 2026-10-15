/* eslint-env node */
import connectToDatabase from "@/lib/mongodb.js";
import PhotosLibraryConfig from "@/models/PhotosLibraryConfig.js";
import { gallery as defaultGallery } from "#constants";

const LIBRARY_KEY = "main";

const safeString = (value) => String(value ?? "").trim();

const safeNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeMediaType = (value) => {
  const type = safeString(value).toLowerCase();
  if (type === "video") return "video";
  return "image";
};

const normalizeDefaultGallery = () =>
  (Array.isArray(defaultGallery) ? defaultGallery : []).map((item, idx) => {
    const id = safeNumber(item?.id, idx + 1);
    const src = safeString(item?.img);
    return {
      id,
      type: "image",
      src,
      thumb: src,
      publicId: "",
      format: "",
      width: 0,
      height: 0,
      duration: 0,
      bytes: 0,
      albumId: 1,
      createdAt: 0,
    };
  });

export const normalizePhotosLibraryPayload = (payload) => {
  const list = Array.isArray(payload) ? payload : [];

  return list
    .map((item, idx) => {
      const id = safeNumber(item?.id, idx + 1);
      const type = normalizeMediaType(item?.type);
      const src = safeString(item?.src);
      const thumb = safeString(item?.thumb) || (type === "image" ? src : "");

      return {
        id,
        type,
        src,
        thumb,
        publicId: safeString(item?.publicId),
        format: safeString(item?.format),
        width: safeNumber(item?.width, 0) ?? 0,
        height: safeNumber(item?.height, 0) ?? 0,
        duration: safeNumber(item?.duration, 0) ?? 0,
        bytes: safeNumber(item?.bytes, 0) ?? 0,
        albumId: safeNumber(item?.albumId, 1) ?? 1,
        createdAt: safeNumber(item?.createdAt, 0) ?? 0,
      };
    })
    .filter((item) => item.id != null);
};

const ensureUniqueIds = (items) => {
  const list = Array.isArray(items) ? items : [];
  const used = new Set();

  let nextId = 1;
  const allocate = () => {
    while (used.has(nextId)) nextId += 1;
    const id = nextId;
    used.add(id);
    nextId += 1;
    return id;
  };

  return list.map((item) => {
    const numericId = safeNumber(item?.id, null);
    if (numericId == null || numericId < 1 || used.has(numericId)) {
      return { ...item, id: allocate() };
    }
    used.add(numericId);
    return { ...item, id: numericId };
  });
};

export const getPhotosLibrary = async ({ seedIfMissing = true } = {}) => {
  const connection = await connectToDatabase();
  if (!connection) {
    return { ok: false, items: normalizeDefaultGallery(), source: "constants" };
  }

  const doc = await PhotosLibraryConfig.findOne({ key: LIBRARY_KEY }).lean();
  if (doc?.items?.length) {
    const normalized = ensureUniqueIds(normalizePhotosLibraryPayload(doc.items));

    const hasChanges = JSON.stringify(normalized) !== JSON.stringify(doc.items);
    if (hasChanges) {
      await PhotosLibraryConfig.updateOne(
        { key: LIBRARY_KEY },
        { $set: { key: LIBRARY_KEY, items: normalized } }
      );
      return { ok: true, items: normalized, source: "db-migrated" };
    }

    return { ok: true, items: normalized, source: "db" };
  }

  const seed = normalizeDefaultGallery();

  if (seedIfMissing) {
    await PhotosLibraryConfig.updateOne(
      { key: LIBRARY_KEY },
      { $set: { key: LIBRARY_KEY, items: seed } },
      { upsert: true }
    );
  }

  return { ok: true, items: seed, source: "seed" };
};

export const savePhotosLibrary = async ({ items }) => {
  const connection = await connectToDatabase();
  if (!connection) {
    return { ok: false, error: "Database unavailable" };
  }

  const normalized = ensureUniqueIds(normalizePhotosLibraryPayload(items));

  await PhotosLibraryConfig.updateOne(
    { key: LIBRARY_KEY },
    { $set: { key: LIBRARY_KEY, items: normalized } },
    { upsert: true }
  );

  return { ok: true, items: normalized };
};

