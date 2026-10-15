/* eslint-env node */
import { createReadStream, statSync } from "fs";
import { Readable } from "stream";

import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

import { getResumeConfig } from "@/lib/resume.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const safeString = (value) => String(value ?? "").trim();

const getCloudinaryConfig = () => ({
  cloudName: safeString(process.env.CLOUDINARY_CLOUD_NAME),
  apiKey: safeString(process.env.CLOUDINARY_API_KEY),
  apiSecret: safeString(process.env.CLOUDINARY_API_SECRET),
});

const isCloudinaryConfigured = (config) =>
  Boolean(config?.cloudName && config?.apiKey && config?.apiSecret);

const getCloudinaryPublicId = (resume) => safeString(resume?.publicId);

const buildCloudinaryDownloadUrl = (resume, { expiresInSeconds = 10 * 60 } = {}) => {
  const config = getCloudinaryConfig();
  const publicId = getCloudinaryPublicId(resume);
  if (!publicId || !isCloudinaryConfigured(config)) return null;

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });

  const expiresAt = Math.floor(Date.now() / 1000) + Math.max(60, expiresInSeconds);

  const hasExtension = /\.[a-z0-9]{2,10}$/i.test(publicId);
  const fallbackFormat = safeString(resume?.fileName).split(".").pop() || "pdf";
  const format = hasExtension ? "" : fallbackFormat;

  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: "raw",
    type: "upload",
    expires_at: expiresAt,
  });
};

const parseRange = (rangeHeader) => {
  const range = safeString(rangeHeader);
  if (!range.startsWith("bytes=")) return null;
  const raw = range.slice("bytes=".length).split(",")[0].trim();
  const [startRaw, endRaw] = raw.split("-");
  const start = startRaw ? Number(startRaw) : NaN;
  const end = endRaw ? Number(endRaw) : NaN;

  const startValue = Number.isFinite(start) ? start : null;
  const endValue = Number.isFinite(end) ? end : null;

  if (startValue == null && endValue == null) return null;
  return { start: startValue, end: endValue };
};

const buildDisposition = ({ download, fileName }) => {
  const sanitized = safeString(fileName).replaceAll("\"", "") || "Resume.pdf";
  const type = download ? "attachment" : "inline";
  return `${type}; filename="${sanitized}"`;
};

const RESUME_REMOTE_CACHE_TTL_MS = 5 * 60 * 1000;
const getResumeRemoteCache = () => {
  if (!globalThis.__portfolioResumeRemoteCache) {
    globalThis.__portfolioResumeRemoteCache = new Map();
  }
  return globalThis.__portfolioResumeRemoteCache;
};

const fetchRemotePdfBytes = async ({ url, cacheKey }) => {
  const cache = getResumeRemoteCache();
  const now = Date.now();
  const existing = cache.get(cacheKey);

  if (existing?.bytes?.byteLength) {
    const age = now - (existing.fetchedAtMs ?? 0);
    if (age >= 0 && age < RESUME_REMOTE_CACHE_TTL_MS) return existing;
  }

  if (existing?.promise) {
    try {
      return await existing.promise;
    } catch {
      cache.delete(cacheKey);
    }
  }

  const promise = (async () => {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      const error = new Error("Resume is unavailable");
      error.status = upstream.status || 502;
      throw error;
    }

    const buffer = await upstream.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const contentType = safeString(upstream.headers.get("content-type")) || "application/pdf";

    const entry = { bytes, contentType, fetchedAtMs: Date.now() };
    cache.set(cacheKey, entry);
    return entry;
  })();

  cache.set(cacheKey, { promise, fetchedAtMs: now });
  return promise;
};

const proxyRemotePdf = async ({ url, cacheKey, rangeHeader, download, fileName }) => {
  let entry;
  try {
    entry = await fetchRemotePdfBytes({ url, cacheKey });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Resume is unavailable" },
      { status: error?.status || 502 }
    );
  }

  const bytes = entry.bytes;
  const size = bytes.byteLength;
  const parsedRange = parseRange(rangeHeader);

  const responseHeaders = new Headers();
  responseHeaders.set("content-type", entry.contentType || "application/pdf");
  responseHeaders.set("content-disposition", buildDisposition({ download, fileName }));
  responseHeaders.set("accept-ranges", "bytes");
  responseHeaders.set("cache-control", "no-store");

  let start = 0;
  let end = size - 1;
  let status = 200;

  if (parsedRange) {
    if (parsedRange.start != null) start = parsedRange.start;
    if (parsedRange.end != null) end = parsedRange.end;
    if (parsedRange.start == null && parsedRange.end != null) {
      start = Math.max(0, size - parsedRange.end);
      end = size - 1;
    }

    start = Math.max(0, start);
    end = Math.min(size - 1, end);

    if (start > end) {
      responseHeaders.set("content-range", `bytes */${size}`);
      return new NextResponse(null, { status: 416, headers: responseHeaders });
    }

    status = 206;
    responseHeaders.set("content-range", `bytes ${start}-${end}/${size}`);
    responseHeaders.set("content-length", String(end - start + 1));
  } else {
    responseHeaders.set("content-length", String(size));
  }

  const body = parsedRange ? bytes.slice(start, end + 1) : bytes;
  return new NextResponse(body, { status, headers: responseHeaders });
};

const proxyLocalPdf = async ({ path, rangeHeader, download, fileName }) => {
  const relative = safeString(path);
  if (!relative.startsWith("/") || relative.includes("..")) {
    return NextResponse.json({ ok: false, error: "Invalid resume path" }, { status: 400 });
  }
  const filePath = `public${relative}`;

  let stats;
  try {
    stats = statSync(filePath);
  } catch {
    return NextResponse.json({ ok: false, error: "Resume file is missing" }, { status: 404 });
  }
  const size = stats.size;
  const parsedRange = parseRange(rangeHeader);

  const headers = new Headers();
  headers.set("content-type", "application/pdf");
  headers.set("accept-ranges", "bytes");
  headers.set("content-disposition", buildDisposition({ download, fileName }));
  headers.set("cache-control", "no-store");

  let start = 0;
  let end = size - 1;
  let status = 200;

  if (parsedRange) {
    if (parsedRange.start != null) start = parsedRange.start;
    if (parsedRange.end != null) end = parsedRange.end;
    if (parsedRange.start == null && parsedRange.end != null) {
      start = Math.max(0, size - parsedRange.end);
      end = size - 1;
    }

    start = Math.max(0, start);
    end = Math.min(size - 1, end);

    if (start > end) {
      headers.set("content-range", `bytes */${size}`);
      return new NextResponse(null, { status: 416, headers });
    }

    status = 206;
    headers.set("content-range", `bytes ${start}-${end}/${size}`);
    headers.set("content-length", String(end - start + 1));
  } else {
    headers.set("content-length", String(size));
  }

  const nodeStream = createReadStream(filePath, { start, end });
  const body = Readable.toWeb(nodeStream);
  return new NextResponse(body, { status, headers });
};

export async function GET(request) {
  const { resume } = await getResumeConfig();
  const resumeUrl = safeString(resume?.url);

  const requestUrl = new URL(request.url);
  const download = requestUrl.searchParams.get("download") === "1";

  const rangeHeader = request.headers.get("range");
  const fileName = safeString(resume?.fileName) || safeString(resume?.title) || "Resume.pdf";

  if (!resumeUrl) {
    return NextResponse.json({ ok: false, error: "Resume is not configured" }, { status: 404 });
  }

  if (resumeUrl.startsWith("/")) {
    return proxyLocalPdf({
      path: resumeUrl,
      rangeHeader,
      download,
      fileName,
    });
  }

  const cloudinaryDownloadUrl = buildCloudinaryDownloadUrl(resume);
  if (cloudinaryDownloadUrl) {
    return proxyRemotePdf({
      url: cloudinaryDownloadUrl,
      cacheKey: `cloudinary:${safeString(resume?.publicId)}:${safeString(resume?.updatedAtMs)}`,
      rangeHeader,
      download,
      fileName,
    });
  }

  return proxyRemotePdf({
    url: resumeUrl,
    cacheKey: `url:${resumeUrl}:${safeString(resume?.updatedAtMs)}`,
    rangeHeader,
    download,
    fileName,
  });
}
