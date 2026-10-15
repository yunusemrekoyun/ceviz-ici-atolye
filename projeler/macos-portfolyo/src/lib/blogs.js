/* eslint-env node */
import connectToDatabase from "@/lib/mongodb.js";
import BlogsConfig from "@/models/BlogsConfig.js";
import { blogPosts as defaultBlogPosts } from "#constants";

const BLOGS_KEY = "main";

const safeString = (value) => String(value ?? "").trim();

const safeNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeStatus = (value) => {
  const status = safeString(value).toLowerCase();
  if (status === "draft") return "draft";
  return "live";
};

const normalizeDefaultBlogs = () =>
  (Array.isArray(defaultBlogPosts) ? defaultBlogPosts : []).map((post, idx) => ({
    id: safeNumber(post?.id, idx + 1),
    title: safeString(post?.title),
    summary: safeString(post?.summary),
    content: safeString(post?.content),
    date: safeString(post?.date),
    link: safeString(post?.link),
    status: normalizeStatus(post?.status),
    image: safeString(post?.image),
    imagePublicId: safeString(post?.imagePublicId),
    imageFormat: safeString(post?.imageFormat),
    imageWidth: safeNumber(post?.imageWidth, 0) ?? 0,
    imageHeight: safeNumber(post?.imageHeight, 0) ?? 0,
    imageBytes: safeNumber(post?.imageBytes, 0) ?? 0,
    createdAt: safeNumber(post?.createdAt, 0) ?? 0,
    updatedAt: safeNumber(post?.updatedAt, 0) ?? 0,
  }));

export const normalizeBlogsPayload = (payload) => {
  const list = Array.isArray(payload) ? payload : [];

  return list
    .map((post, idx) => ({
      id: safeNumber(post?.id, idx + 1),
      title: safeString(post?.title),
      summary: safeString(post?.summary),
      content: safeString(post?.content),
      date: safeString(post?.date),
      link: safeString(post?.link),
      status: normalizeStatus(post?.status),
      image: safeString(post?.image),
      imagePublicId: safeString(post?.imagePublicId),
      imageFormat: safeString(post?.imageFormat),
      imageWidth: safeNumber(post?.imageWidth, 0) ?? 0,
      imageHeight: safeNumber(post?.imageHeight, 0) ?? 0,
      imageBytes: safeNumber(post?.imageBytes, 0) ?? 0,
      createdAt: safeNumber(post?.createdAt, 0) ?? 0,
      updatedAt: safeNumber(post?.updatedAt, 0) ?? 0,
    }))
    .filter((post) => post.id != null);
};

const ensureUniqueIds = (posts) => {
  const list = Array.isArray(posts) ? posts : [];
  const used = new Set();
  let nextId = 1;

  const allocate = () => {
    while (used.has(nextId)) nextId += 1;
    const id = nextId;
    used.add(id);
    nextId += 1;
    return id;
  };

  return list.map((post) => {
    const numericId = safeNumber(post?.id, null);
    if (numericId == null || numericId < 1 || used.has(numericId)) {
      return { ...post, id: allocate() };
    }
    used.add(numericId);
    return { ...post, id: numericId };
  });
};

export const getBlogs = async ({ seedIfMissing = true } = {}) => {
  const connection = await connectToDatabase();
  const seed = normalizeDefaultBlogs();
  const seedSignature = JSON.stringify(seed);
  if (!connection) {
    return { ok: false, posts: seed, source: "constants" };
  }

  const doc = await BlogsConfig.findOne({ key: BLOGS_KEY }).lean();
  if (doc?.posts?.length) {
    const normalized = ensureUniqueIds(normalizeBlogsPayload(doc.posts));
    const normalizedSignature = JSON.stringify(normalized);
    const hasChanges = normalizedSignature !== JSON.stringify(doc.posts);
    const isSeed = normalizedSignature === seedSignature;
    if (hasChanges) {
      await BlogsConfig.updateOne(
        { key: BLOGS_KEY },
        { $set: { key: BLOGS_KEY, posts: normalized } }
      );
      return {
        ok: true,
        posts: normalized,
        source: isSeed ? "seed" : "db-migrated",
      };
    }

    return { ok: true, posts: normalized, source: isSeed ? "seed" : "db" };
  }

  if (seedIfMissing) {
    await BlogsConfig.updateOne(
      { key: BLOGS_KEY },
      { $set: { key: BLOGS_KEY, posts: seed } },
      { upsert: true }
    );
  }

  return { ok: true, posts: seed, source: "seed" };
};

export const saveBlogs = async ({ posts }) => {
  const connection = await connectToDatabase();
  if (!connection) {
    return { ok: false, error: "Database unavailable" };
  }

  const normalized = ensureUniqueIds(normalizeBlogsPayload(posts));

  await BlogsConfig.updateOne(
    { key: BLOGS_KEY },
    { $set: { key: BLOGS_KEY, posts: normalized } },
    { upsert: true }
  );

  return { ok: true, posts: normalized };
};
