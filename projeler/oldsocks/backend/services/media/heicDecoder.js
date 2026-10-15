const path = require("node:path");
const { Worker } = require("node:worker_threads");
const { mediaError } = require("./errors");

function decodeHeicToPng({ sourcePath, destinationPath, maxPixels }) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "heicDecodeWorker.js"), {
      workerData: { sourcePath, destinationPath, maxPixels },
    });
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      worker.terminate();
      reject(mediaError("MEDIA_PROCESSING_FAILED", 422));
    }, 120_000);
    timer.unref();

    worker.once("message", (message) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      if (message?.error?.code === "HEIC_PIXEL_LIMIT") {
        reject(
          mediaError("MEDIA_FILE_TOO_LARGE", 413, {
            message: "Fotoğrafın çözünürlüğü işleme sınırını aşıyor.",
          })
        );
        return;
      }
      if (message?.error) {
        reject(mediaError("MEDIA_CORRUPT", 422));
        return;
      }
      resolve(message);
    });
    worker.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    worker.once("exit", (code) => {
      if (settled || code === 0) return;
      settled = true;
      clearTimeout(timer);
      reject(mediaError("MEDIA_PROCESSING_FAILED", 422));
    });
  });
}

module.exports = { decodeHeicToPng };
