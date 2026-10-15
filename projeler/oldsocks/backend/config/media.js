const path = require("node:path");

const MIB = 1024 * 1024;
const GIB = 1024 * MIB;

const MEDIA_KINDS = Object.freeze({
  IMAGE: "image",
  VIDEO: "video",
});

const PURPOSES = Object.freeze({
  PRODUCT_IMAGE: "product_image",
  PRODUCT_VIDEO: "product_video",
  CATEGORY_IMAGE: "category_image",
  CAMPAIGN_IMAGE: "campaign_image",
  MINI_CAMPAIGN_IMAGE: "mini_campaign_image",
  BLOG_COVER: "blog_cover",
  HERO_IMAGE: "hero_image",
  HERO_VIDEO: "hero_video",
  PROFILE_IMAGE: "profile_image",
  SITE_LOGO: "site_logo",
  ABOUT_IMAGE: "about_image",
});

const IMAGE_MIME_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const VIDEO_MIME_TYPES = Object.freeze([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const IMAGE_EXTENSION_TYPES = Object.freeze([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "heif",
]);

const VIDEO_EXTENSION_TYPES = Object.freeze(["mp4", "mov", "webm"]);

const IMAGE_PROFILES = Object.freeze({
  product: {
    widths: [320, 640, 960, 1440, 2400],
    maxPixels: 40_000_000,
    masterWidth: 2400,
    jpegFallbackWidth: 1200,
    quality: 84,
  },
  banner: {
    widths: [768, 1280, 1920, 2560],
    maxPixels: 50_000_000,
    masterWidth: 2560,
    jpegFallbackWidth: 1200,
    quality: 84,
  },
  content: {
    widths: [640, 960, 1440, 1920],
    maxPixels: 40_000_000,
    masterWidth: 1920,
    jpegFallbackWidth: 1200,
    quality: 84,
  },
  profile: {
    widths: [256, 512],
    maxPixels: 12_000_000,
    masterWidth: 512,
    jpegFallbackWidth: null,
    quality: 82,
    square: true,
  },
});

const VIDEO_PROFILES = Object.freeze({
  product: {
    maxDurationSeconds: 30,
    keepAudio: true,
    variants: [
      { name: "list", width: 854, height: 480, videoBitrate: "900k" },
      { name: "detail", width: 1280, height: 720, videoBitrate: "2600k" },
    ],
    posterWidths: [320, 640, 960],
  },
  hero: {
    maxDurationSeconds: 30,
    keepAudio: false,
    variants: [
      { name: "mobile", width: 1280, height: 720, videoBitrate: "2600k" },
      { name: "desktop", width: 1920, height: 1080, videoBitrate: "5500k" },
    ],
    posterWidths: [768, 1280, 1920],
  },
});

const PURPOSE_POLICIES = Object.freeze({
  [PURPOSES.PRODUCT_IMAGE]: {
    kind: MEDIA_KINDS.IMAGE,
    maxBytes: 15 * MIB,
    profile: IMAGE_PROFILES.product,
  },
  [PURPOSES.PRODUCT_VIDEO]: {
    kind: MEDIA_KINDS.VIDEO,
    maxBytes: 200 * MIB,
    profile: VIDEO_PROFILES.product,
  },
  [PURPOSES.CATEGORY_IMAGE]: {
    kind: MEDIA_KINDS.IMAGE,
    maxBytes: 15 * MIB,
    profile: IMAGE_PROFILES.content,
  },
  [PURPOSES.CAMPAIGN_IMAGE]: {
    kind: MEDIA_KINDS.IMAGE,
    maxBytes: 15 * MIB,
    profile: IMAGE_PROFILES.banner,
  },
  [PURPOSES.MINI_CAMPAIGN_IMAGE]: {
    kind: MEDIA_KINDS.IMAGE,
    maxBytes: 15 * MIB,
    profile: IMAGE_PROFILES.banner,
  },
  [PURPOSES.BLOG_COVER]: {
    kind: MEDIA_KINDS.IMAGE,
    maxBytes: 15 * MIB,
    profile: IMAGE_PROFILES.content,
  },
  [PURPOSES.HERO_IMAGE]: {
    kind: MEDIA_KINDS.IMAGE,
    maxBytes: 15 * MIB,
    profile: IMAGE_PROFILES.banner,
  },
  [PURPOSES.HERO_VIDEO]: {
    kind: MEDIA_KINDS.VIDEO,
    maxBytes: 200 * MIB,
    profile: VIDEO_PROFILES.hero,
  },
  [PURPOSES.PROFILE_IMAGE]: {
    kind: MEDIA_KINDS.IMAGE,
    maxBytes: 5 * MIB,
    profile: IMAGE_PROFILES.profile,
  },
  [PURPOSES.SITE_LOGO]: {
    kind: MEDIA_KINDS.IMAGE,
    maxBytes: 15 * MIB,
    profile: IMAGE_PROFILES.content,
  },
  [PURPOSES.ABOUT_IMAGE]: {
    kind: MEDIA_KINDS.IMAGE,
    maxBytes: 15 * MIB,
    profile: IMAGE_PROFILES.content,
  },
});

function readPositiveInteger(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function readNonNegativeInteger(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function readReservePercent(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : fallback;
}

function resolveMediaRoot() {
  const configured = String(process.env.MEDIA_ROOT || "").trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? path.normalize(configured)
      : path.resolve(__dirname, "..", configured);
  }
  return path.resolve(__dirname, "..", "..", "storage", "media");
}

function resolvePublicBaseUrl() {
  const configured = String(process.env.MEDIA_PUBLIC_BASE_URL || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  const backendUrl = String(process.env.BACKEND_PUBLIC_URL || "").replace(
    /\/+$/,
    ""
  );
  return `${backendUrl}/media`;
}

const sharedVolume =
  String(process.env.MEDIA_SHARED_VOLUME || "true").toLowerCase() !== "false";

const MEDIA_RUNTIME = Object.freeze({
  root: resolveMediaRoot(),
  publicBaseUrl: resolvePublicBaseUrl(),
  chunkBytes: readPositiveInteger("MEDIA_CHUNK_BYTES", 16 * MIB),
  sessionTtlMs: readPositiveInteger(
    "MEDIA_UPLOAD_SESSION_TTL_MS",
    24 * 60 * 60 * 1000
  ),
  perAdminInFlightBytes: readPositiveInteger(
    "MEDIA_ADMIN_INFLIGHT_BYTES",
    512 * MIB
  ),
  globalStagingBytes: readPositiveInteger(
    "MEDIA_GLOBAL_STAGING_BYTES",
    2 * GIB
  ),
  hourlyIngestBytes: readPositiveInteger(
    "MEDIA_ADMIN_HOURLY_BYTES",
    2 * GIB
  ),
  dailyIngestBytes: readPositiveInteger(
    "MEDIA_ADMIN_DAILY_BYTES",
    10 * GIB
  ),
  operationMarginBytes: readPositiveInteger(
    "MEDIA_OPERATION_MARGIN_BYTES",
    2 * GIB
  ),
  sharedVolume,
  reservePercent: readReservePercent(
    "MEDIA_RESERVE_PERCENT",
    sharedVolume ? 20 : 15
  ),
  reserveBytes: readNonNegativeInteger(
    "MEDIA_RESERVE_BYTES",
    sharedVolume ? 20 * GIB : 10 * GIB
  ),
  requireBackupBeforePublish:
    String(process.env.MEDIA_REQUIRE_BACKUP_BEFORE_PUBLISH || "false").toLowerCase() ===
    "true",
});

function getPurposePolicy(purpose) {
  return PURPOSE_POLICIES[purpose] || null;
}

module.exports = {
  GIB,
  IMAGE_EXTENSION_TYPES,
  IMAGE_MIME_TYPES,
  MEDIA_KINDS,
  MEDIA_RUNTIME,
  MIB,
  PURPOSE_POLICIES,
  PURPOSES,
  VIDEO_EXTENSION_TYPES,
  VIDEO_MIME_TYPES,
  getPurposePolicy,
};
