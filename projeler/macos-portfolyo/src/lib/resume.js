/* eslint-env node */
import connectToDatabase from "@/lib/mongodb.js";
import ResumeConfig from "@/models/ResumeConfig.js";
import { resumeConfig as defaultResumeConfig } from "#constants";

const RESUME_KEY = "main";

const safeString = (value) => String(value ?? "").trim();

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeUrl = (value) => safeString(value);

const buildFallback = () => ({
  key: RESUME_KEY,
  title: safeString(defaultResumeConfig?.title) || "Resume.pdf",
  url: safeString(defaultResumeConfig?.filePath) || "/files/resume.pdf",
  publicId: "",
  fileName: safeString(defaultResumeConfig?.title) || "Resume.pdf",
  bytes: 0,
  updatedAtMs: 0,
});

export const normalizeResumePayload = (payload = {}) => {
  const url = normalizeUrl(payload?.url);
  const publicId = safeString(payload?.publicId);
  const fileName = safeString(payload?.fileName);
  const bytes = Math.max(0, safeNumber(payload?.bytes, 0));

  return {
    url,
    publicId,
    fileName,
    bytes,
  };
};

export const getResumeConfig = async ({ seedIfMissing = true } = {}) => {
  const fallback = buildFallback();
  const connection = await connectToDatabase();

  if (!connection) {
    return { ok: false, resume: fallback, source: "constants" };
  }

  const doc = await ResumeConfig.findOne({ key: RESUME_KEY }).lean();
  if (doc?.url) {
    return {
      ok: true,
      resume: {
        ...fallback,
        url: safeString(doc.url) || fallback.url,
        publicId: safeString(doc.publicId),
        fileName: safeString(doc.fileName) || fallback.fileName,
        bytes: safeNumber(doc.bytes, fallback.bytes),
        updatedAtMs: safeNumber(doc.updatedAtMs, fallback.updatedAtMs),
      },
      source: "db",
    };
  }

  if (seedIfMissing) {
    const seed = buildFallback();
    await ResumeConfig.updateOne(
      { key: RESUME_KEY },
      {
        $set: {
          key: RESUME_KEY,
          url: seed.url,
          publicId: seed.publicId,
          fileName: seed.fileName,
          bytes: seed.bytes,
          updatedAtMs: seed.updatedAtMs,
        },
      },
      { upsert: true }
    );
  }

  return { ok: true, resume: fallback, source: "seed" };
};

export const saveResumeConfig = async (payload) => {
  const connection = await connectToDatabase();
  if (!connection) {
    return { ok: false, error: "Database unavailable" };
  }

  const normalized = normalizeResumePayload(payload);
  if (!normalized.url) {
    return { ok: false, error: "Missing resume URL" };
  }

  const updatedAtMs = Date.now();
  const fallback = buildFallback();
  const fileName = normalized.fileName || fallback.fileName;

  await ResumeConfig.updateOne(
    { key: RESUME_KEY },
    {
      $set: {
        key: RESUME_KEY,
        url: normalized.url,
        publicId: normalized.publicId,
        fileName,
        bytes: normalized.bytes,
        updatedAtMs,
      },
    },
    { upsert: true }
  );

  return {
    ok: true,
    resume: {
      ...fallback,
      url: normalized.url,
      publicId: normalized.publicId,
      fileName,
      bytes: normalized.bytes,
      updatedAtMs,
    },
  };
};
