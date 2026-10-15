const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const MediaAsset = require("../../models/MediaAsset");
const MediaProcessingJob = require("../../models/MediaProcessingJob");
const { MediaError } = require("./errors");
const { sha256File } = require("./fileInspection");
const { processMediaAsset } = require("./processors");
const { absolutePathForKey } = require("./storage");

const STALE_LOCK_MS = 20 * 60 * 1000;
const NON_RETRYABLE_CODES = new Set([
  "MEDIA_INVALID_REQUEST",
  "MEDIA_UNSUPPORTED_PURPOSE",
  "MEDIA_FILE_TOO_LARGE",
  "MEDIA_UNSUPPORTED_FORMAT",
  "MEDIA_PRORES_UNSUPPORTED",
  "MEDIA_DURATION_EXCEEDED",
  "MEDIA_CORRUPT",
]);

async function claimJob(workerId) {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);
  return MediaProcessingJob.findOneAndUpdate(
    {
      $or: [
        { status: "queued", nextAttemptAt: { $lte: now } },
        { status: "processing", lockedAt: { $lte: staleBefore } },
      ],
    },
    {
      $set: {
        status: "processing",
        lockedAt: now,
        workerId,
        errorCode: "",
        errorMessage: "",
      },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { priority: 1, nextAttemptAt: 1, createdAt: 1 } }
  );
}

function retryDelayMs(attempts) {
  return Math.min(10 * 60 * 1000, 15_000 * 2 ** Math.max(0, attempts - 1));
}

async function removeStagingSource(asset) {
  const key = asset.original?.stagingKey;
  if (!key) return;
  await fsp.rm(path.dirname(absolutePathForKey(key)), {
    recursive: true,
    force: true,
  });
}

async function completeJob(job, asset, result) {
  await MediaAsset.updateOne(
    { _id: asset._id },
    {
      $set: {
        status: "ready",
        metadata: result.metadata,
        variants: result.variants,
        primaryVariant: result.primaryVariant,
        manifestKey: result.manifestKey,
        "original.stagingKey": "",
        "processing.attempts": job.attempts,
        "processing.completedAt": new Date(),
        "processing.errorCode": "",
        "processing.errorMessage": "",
      },
    }
  );
  await MediaProcessingJob.updateOne(
    { _id: job._id, workerId: job.workerId },
    {
      $set: {
        status: "completed",
        completedAt: new Date(),
        lockedAt: null,
        workerId: "",
        errorCode: "",
        errorMessage: "",
      },
    }
  );
  await removeStagingSource(asset);
}

async function failJob(job, asset, error) {
  const code = error instanceof MediaError ? error.code : "MEDIA_PROCESSING_FAILED";
  const safeMessage =
    error instanceof MediaError
      ? error.message
      : "Dosya işlenirken beklenmeyen bir hata oluştu. Orijinal dosya geçici olarak korunuyor.";
  const retryable = !NON_RETRYABLE_CODES.has(code) && job.attempts < job.maxAttempts;
  const nextAttemptAt = new Date(Date.now() + retryDelayMs(job.attempts));

  await Promise.all([
    MediaProcessingJob.updateOne(
      { _id: job._id, workerId: job.workerId },
      {
        $set: {
          status: retryable ? "queued" : "failed",
          nextAttemptAt,
          lockedAt: null,
          workerId: "",
          errorCode: code,
          errorMessage: String(safeMessage).slice(0, 500),
        },
      }
    ),
    MediaAsset.updateOne(
      { _id: asset._id },
      {
        $set: {
          status: retryable ? "uploaded" : "failed",
          "processing.attempts": job.attempts,
          "processing.errorCode": code,
          "processing.errorMessage": String(safeMessage).slice(0, 500),
        },
      }
    ),
  ]);
}

async function processClaimedJob(job) {
  const asset = await MediaAsset.findById(job.asset);
  if (!asset) {
    await MediaProcessingJob.updateOne(
      { _id: job._id },
      {
        $set: {
          status: "cancelled",
          lockedAt: null,
          workerId: "",
          errorCode: "MEDIA_SESSION_NOT_FOUND",
        },
      }
    );
    return;
  }
  await MediaAsset.updateOne(
    { _id: asset._id },
    {
      $set: {
        status: "processing",
        "processing.startedAt": new Date(),
        "processing.attempts": job.attempts,
      },
    }
  );
  try {
    if (!asset.original.checksumSha256) {
      const checksum = await sha256File(absolutePathForKey(asset.original.stagingKey));
      asset.original.checksumSha256 = checksum;
      await asset.save();
    }
    const result = await processMediaAsset(asset, job._id);
    await completeJob(job, asset, result);
  } catch (error) {
    console.error(
      `[media-worker] asset=${asset._id} attempt=${job.attempts} error=${
        error?.stack || error?.code || error?.message || error
      }`
    );
    await failJob(job, asset, error);
  }
}

function startMediaWorker(options = {}) {
  const workerId =
    options.workerId || `${os.hostname()}-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
  const pollMs = Math.max(250, Number(options.pollMs || 1_000));
  let stopped = false;
  let timer = null;
  let active = null;

  const schedule = (delay = pollMs) => {
    if (stopped) return;
    timer = setTimeout(tick, delay);
    timer.unref();
  };

  const tick = async () => {
    if (stopped || active) return;
    try {
      const job = await claimJob(workerId);
      if (job) {
        active = processClaimedJob(job);
        await active;
      }
    } catch (error) {
      console.error("[media-worker] queue error:", error?.message || error);
    } finally {
      active = null;
      schedule();
    }
  };

  console.log(`[media-worker] started: ${workerId}`);
  schedule(0);
  return {
    workerId,
    async stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (active) await active.catch(() => {});
      console.log(`[media-worker] stopped: ${workerId}`);
    },
  };
}

module.exports = { claimJob, processClaimedJob, startMediaWorker };
