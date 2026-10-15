const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fsp = require("node:fs/promises");
const { Readable, Writable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const sharp = require("sharp");

const mediaRoot = path.join(os.tmpdir(), `oldscks-media-test-${process.pid}`);
process.env.MEDIA_ROOT = mediaRoot;
process.env.MEDIA_PUBLIC_BASE_URL = "https://media.test.invalid";

const { MediaError, toMediaErrorPayload } = require("../services/media/errors");
const {
  byteLimitTransform,
  extensionFromName,
  inspectFileType,
  sha256File,
} = require("../services/media/fileInspection");
const {
  absolutePathForKey,
  assetAbsolutePath,
  assetPublicUrl,
  initializeMediaStorage,
} = require("../services/media/storage");
const { processMediaAsset } = require("../services/media/processors");
const { serializeAsset } = require("../services/media/serializers");
const { publicAsset } = require("../services/media/assets");

test.before(async () => {
  await fsp.rm(mediaRoot, { recursive: true, force: true });
  await initializeMediaStorage();
});

test.after(async () => {
  await fsp.rm(mediaRoot, { recursive: true, force: true });
});

test("medya yolları kök dizinin dışına çıkamaz", () => {
  assert.throws(
    () => absolutePathForKey("../../etc/passwd"),
    (error) => error instanceof MediaError && error.code === "MEDIA_INVALID_REQUEST"
  );
  assert.equal(
    assetPublicUrl("product_image/asset 1/w320.webp"),
    "https://media.test.invalid/product_image/asset%201/w320.webp"
  );
});

test("dosya uzantısı normalize edilir ve akış byte sınırı zorlanır", async () => {
  assert.equal(extensionFromName("Telefon Fotoğrafı.HEIC"), "heic");
  const sink = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
  await assert.rejects(
    pipeline(Readable.from([Buffer.alloc(6)]), byteLimitTransform(5), sink),
    (error) => error instanceof MediaError && error.code === "MEDIA_FILE_TOO_LARGE"
  );
});

test("dosya türü uzantıya değil gerçek imzaya göre anlaşılır", async () => {
  const inputPath = path.join(mediaRoot, "signature-test.not-an-image");
  await sharp({
    create: { width: 10, height: 10, channels: 3, background: "#123456" },
  }).png().toFile(inputPath);
  const detected = await inspectFileType(inputPath, "fake.exe");
  assert.deepEqual(detected, { mime: "image/png", extension: "png", kind: "image" });
  assert.match(await sha256File(inputPath), /^[a-f0-9]{64}$/);
});

test("görsel işleyici responsive WebP ve JPEG fallback üretir", async () => {
  const sourceKey = "staging/test-session/source.upload";
  const sourcePath = absolutePathForKey(sourceKey);
  await fsp.mkdir(path.dirname(sourcePath), { recursive: true });
  await sharp({
    create: { width: 900, height: 1200, channels: 3, background: "#8b5cf6" },
  }).jpeg({ quality: 90 }).toFile(sourcePath);

  const asset = {
    _id: "507f1f77bcf86cd799439011",
    purpose: "product_image",
    kind: "image",
    original: {
      stagingKey: sourceKey,
      detectedExtension: "jpg",
      detectedMime: "image/jpeg",
    },
  };
  const result = await processMediaAsset(asset, "507f191e810c19729de860ea");
  assert.ok(result.variants.some((variant) => variant.format === "webp"));
  assert.ok(result.variants.some((variant) => variant.format === "jpeg"));
  assert.ok(result.variants.every((variant) => variant.url.startsWith("https://media.test.invalid/")));
  for (const variant of result.variants) {
    assert.ok((await fsp.stat(assetAbsolutePath(variant.key))).isFile());
  }
  assert.ok((await fsp.stat(assetAbsolutePath(result.manifestKey))).isFile());
});

test("API hata ve medya cevapları güvenli alanlarla serileştirilir", () => {
  const errorPayload = toMediaErrorPayload(
    new MediaError("MEDIA_FILE_TOO_LARGE", { statusCode: 413 }),
    "request-123"
  );
  assert.equal(errorPayload.code, "MEDIA_FILE_TOO_LARGE");
  assert.equal(errorPayload.requestId, "request-123");

  const asset = serializeAsset({
    _id: "507f1f77bcf86cd799439011",
    purpose: "product_image",
    kind: "image",
    status: "ready",
    original: { fileName: "ürün.jpg", declaredMime: "image/jpeg", bytes: 1000 },
    variants: [
      {
        name: "w320",
        kind: "image",
        format: "webp",
        key: "product_image/507f1f77bcf86cd799439011/w320.webp",
        url: "/media/w320.webp",
        mime: "image/webp",
        bytes: 250,
        width: 320,
        height: 427,
      },
    ],
    processing: {},
    backup: {},
  });
  assert.equal(asset.optimizedBytes, 250);
  assert.equal(asset.variants[0].width, 320);
  assert.equal(
    asset.variants[0].url,
    "https://media.test.invalid/product_image/507f1f77bcf86cd799439011/w320.webp"
  );
  assert.equal(asset.original.fileName, "ürün.jpg");
});

test("API medya URL'lerini kayıtlı host yerine çalışma ortamından üretir", () => {
  const asset = publicAsset({
    _id: "507f1f77bcf86cd799439011",
    purpose: "product_image",
    kind: "image",
    metadata: {},
    variants: [
      {
        name: "w640",
        kind: "image",
        format: "webp",
        key: "product_image/507f1f77bcf86cd799439011/w640.webp",
        url: "http://localhost:5050/media/product_image/old-host.webp",
        mime: "image/webp",
        width: 640,
        height: 853,
      },
    ],
  });

  assert.equal(
    asset.url,
    "https://media.test.invalid/product_image/507f1f77bcf86cd799439011/w640.webp"
  );
  assert.equal(asset.sources[0].url, asset.url);
});
