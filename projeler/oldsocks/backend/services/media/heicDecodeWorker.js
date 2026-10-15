const fsp = require("node:fs/promises");
const { parentPort, workerData } = require("node:worker_threads");
const decode = require("heic-decode");
const sharp = require("sharp");

(async () => {
  const source = await fsp.readFile(workerData.sourcePath);
  const decoded = await decode({ buffer: source });
  const pixels = Number(decoded.width) * Number(decoded.height);
  if (!Number.isSafeInteger(pixels) || pixels <= 0 || pixels > workerData.maxPixels) {
    const error = new Error("HEIC_PIXEL_LIMIT");
    error.code = "HEIC_PIXEL_LIMIT";
    throw error;
  }
  await sharp(Buffer.from(decoded.data.buffer), {
    raw: {
      width: decoded.width,
      height: decoded.height,
      channels: 4,
    },
  })
    .png({ compressionLevel: 3 })
    .toFile(workerData.destinationPath);
  parentPort.postMessage({ width: decoded.width, height: decoded.height });
})().catch((error) => {
  parentPort.postMessage({
    error: {
      code: error?.code || "HEIC_DECODE_FAILED",
      message: String(error?.message || error),
    },
  });
});
