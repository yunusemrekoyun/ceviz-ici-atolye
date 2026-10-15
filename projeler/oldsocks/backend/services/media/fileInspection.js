const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { pipeline } = require("node:stream/promises");
const { Transform } = require("node:stream");
const {
  IMAGE_EXTENSION_TYPES,
  IMAGE_MIME_TYPES,
  MEDIA_KINDS,
  VIDEO_EXTENSION_TYPES,
  VIDEO_MIME_TYPES,
} = require("../../config/media");
const { mediaError } = require("./errors");

let fileTypeModulePromise;

function loadFileTypeModule() {
  if (!fileTypeModulePromise) {
    fileTypeModulePromise = import("file-type");
  }
  return fileTypeModulePromise;
}

function extensionFromName(fileName) {
  const extension = path.extname(String(fileName || "")).slice(1).toLowerCase();
  return extension;
}

async function inspectFileType(filePath, declaredName = "") {
  const { fileTypeFromFile } = await loadFileTypeModule();
  const detected = await fileTypeFromFile(filePath);
  if (!detected) {
    throw mediaError("MEDIA_UNSUPPORTED_FORMAT", 415);
  }

  const mime = String(detected.mime || "").toLowerCase();
  const extension = String(detected.ext || extensionFromName(declaredName)).toLowerCase();
  const image = IMAGE_MIME_TYPES.includes(mime) || IMAGE_EXTENSION_TYPES.includes(extension);
  const video = VIDEO_MIME_TYPES.includes(mime) || VIDEO_EXTENSION_TYPES.includes(extension);

  if (!image && !video) {
    throw mediaError("MEDIA_UNSUPPORTED_FORMAT", 415, {
      details: { detectedMime: mime || "unknown" },
    });
  }

  return {
    mime,
    extension,
    kind: image ? MEDIA_KINDS.IMAGE : MEDIA_KINDS.VIDEO,
  };
}

async function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  await pipeline(fs.createReadStream(filePath), hash);
  return hash.digest("hex");
}

async function fileSize(filePath) {
  const stats = await fsp.stat(filePath);
  return stats.size;
}

function byteLimitTransform(maxBytes) {
  let total = 0;
  const transform = new Transform({
    transform(chunk, _encoding, callback) {
      total += chunk.length;
      if (total > maxBytes) {
        callback(mediaError("MEDIA_FILE_TOO_LARGE", 413));
        return;
      }
      callback(null, chunk);
    },
  });
  transform.bytesReceived = () => total;
  return transform;
}

module.exports = {
  byteLimitTransform,
  extensionFromName,
  fileSize,
  inspectFileType,
  sha256File,
};
