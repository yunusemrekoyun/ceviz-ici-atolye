/* eslint-env node */
import { createHash } from "crypto";
import { NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/auth.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = Number(
  process.env.CLOUDINARY_MAX_BYTES || 50 * 1024 * 1024
);

const safeString = (value) => String(value ?? "").trim();

const getCloudinaryConfig = () => ({
  cloudName: safeString(process.env.CLOUDINARY_CLOUD_NAME),
  apiKey: safeString(process.env.CLOUDINARY_API_KEY),
  apiSecret: safeString(process.env.CLOUDINARY_API_SECRET),
  folder: safeString(process.env.CLOUDINARY_FOLDER),
});

const createSignature = (params, apiSecret) => {
  const toSign = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
};

export async function POST(request) {
  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  const payload = await verifyAccessToken(accessToken);

  if (!payload?.sub || payload?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const config = getCloudinaryConfig();
  if (!config.cloudName || !config.apiKey || !config.apiSecret) {
    return NextResponse.json(
      { ok: false, error: "Cloudinary is not configured" },
      { status: 503 }
    );
  }

  const incomingForm = await request.formData().catch(() => null);
  const file = incomingForm?.get("file");

  if (!file || typeof file !== "object" || typeof file.arrayBuffer !== "function") {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }

  if (Number.isFinite(file.size) && file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { ok: false, error: "File is too large" },
      { status: 413 }
    );
  }

  const contentType = safeString(file.type);
  const fileName = safeString(file.name);
  const lowerName = fileName.toLowerCase();
  const isVideo = contentType.startsWith("video/");
  const isImage = contentType.startsWith("image/");
  const isPdf =
    contentType === "application/pdf" ||
    contentType === "application/x-pdf" ||
    (!contentType && lowerName.endsWith(".pdf"));

  if (contentType && !isImage && !isVideo && !isPdf) {
    return NextResponse.json(
      { ok: false, error: "Only image, video, or PDF uploads are supported" },
      { status: 415 }
    );
  }

  const resourceType = isPdf ? "raw" : isVideo ? "video" : "image";

  const incomingFolder = safeString(incomingForm?.get("folder"));
  const folder = [config.folder, incomingFolder].filter(Boolean).join("/");
  const timestamp = Math.floor(Date.now() / 1000);
  const signParams = { timestamp, ...(folder ? { folder } : {}) };
  const signature = createSignature(signParams, config.apiSecret);

  const uploadForm = new FormData();
  uploadForm.append("file", file, file.name || "upload");
  uploadForm.append("api_key", config.apiKey);
  uploadForm.append("timestamp", String(timestamp));
  if (folder) uploadForm.append("folder", folder);
  uploadForm.append("signature", signature);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`,
      { method: "POST", body: uploadForm }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data?.secure_url) {
      return NextResponse.json(
        { ok: false, error: data?.error?.message || "Upload failed" },
        { status: response.status || 502 }
      );
    }

    const publicId = data.public_id;
    const posterUrl =
      resourceType === "video" && publicId
        ? `https://res.cloudinary.com/${config.cloudName}/video/upload/so_0/${publicId}.jpg`
        : null;

    return NextResponse.json({
      ok: true,
      asset: {
        url: data.secure_url,
        publicId,
        resourceType,
        width: data.width,
        height: data.height,
        format: data.format,
        bytes: data.bytes,
        duration: data.duration,
        posterUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Upload failed" },
      { status: 502 }
    );
  }
}
