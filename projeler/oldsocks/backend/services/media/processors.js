const fsp = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const { MEDIA_KINDS, getPurposePolicy } = require("../../config/media");
const { mediaError, MediaError } = require("./errors");
const { mediaCapabilities, FFMPEG_PATH, FFPROBE_PATH } = require("./capabilities");
const { decodeHeicToPng } = require("./heicDecoder");
const { runCommand } = require("./processRunner");
const {
  absolutePathForKey,
  assetDirectoryKey,
  assetPublicUrl,
  atomicMoveDirectory,
  ensureEmptyDirectory,
  removeKey,
  processingKeyForAsset,
} = require("./storage");

const IMAGE_TIMEOUT_SECONDS = 45;
const VIDEO_TIMEOUT_MS = 12 * 60 * 1000;
const VIDEO_MAX_PIXELS = 40_000_000;
// 1 vCPU'da ffmpeg'in tek iş parçacığı kullanması API'ye nefes aldırır.
const VIDEO_THREADS = Math.max(1, Number(process.env.MEDIA_VIDEO_THREADS || 1));

function outputVariant({ relativeKey, name, kind, format, mime, stats, metadata }) {
  return {
    name,
    kind,
    format,
    key: relativeKey,
    url: assetPublicUrl(relativeKey),
    mime,
    bytes: Number(stats.size),
    width: metadata.width || null,
    height: metadata.height || null,
    durationSeconds: metadata.durationSeconds || null,
    bitrate: metadata.bitrate || null,
  };
}

function orientedDimensions(metadata) {
  const rotated = [5, 6, 7, 8].includes(Number(metadata.orientation));
  return {
    width: rotated ? metadata.height : metadata.width,
    height: rotated ? metadata.width : metadata.height,
  };
}

function targetImageWidths(profile, width, height) {
  const sourceLimit = profile.square ? Math.min(width, height) : width;
  const maximum = Math.min(sourceLimit, profile.masterWidth);
  const configured = profile.widths.filter((candidate) => candidate < maximum);
  if (maximum > 0) configured.push(Math.max(1, Math.floor(maximum)));
  return [...new Set(configured)].sort((a, b) => a - b);
}

function baseImagePipeline(inputPath, profile) {
  return sharp(inputPath, {
    failOn: "warning",
    limitInputPixels: profile.maxPixels,
    sequentialRead: true,
  })
    .rotate()
    .toColorspace("srgb")
    .timeout({ seconds: IMAGE_TIMEOUT_SECONDS });
}

async function writeImageVariant({
  inputPath,
  outputPath,
  width,
  profile,
  format,
}) {
  let pipeline = baseImagePipeline(inputPath, profile);
  pipeline = profile.square
    ? pipeline.resize(width, width, {
        fit: "cover",
        position: "attention",
        withoutEnlargement: true,
      })
    : pipeline.resize({ width, withoutEnlargement: true });

  if (format === "webp") {
    pipeline = pipeline.webp({ quality: profile.quality, effort: 4, smartSubsample: true });
  } else {
    pipeline = pipeline
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: profile.quality, mozjpeg: true, progressive: true });
  }
  await pipeline.toFile(outputPath);
  const [stats, metadata] = await Promise.all([
    fsp.stat(outputPath),
    sharp(outputPath).metadata(),
  ]);
  return { stats, metadata };
}

async function normalizeImageInput(asset, sourcePath, workPath, profile) {
  const extension = String(asset.original?.detectedExtension || "").toLowerCase();
  const mime = String(asset.original?.detectedMime || "").toLowerCase();
  if (!["heic", "heif"].includes(extension) && !["image/heic", "image/heif"].includes(mime)) {
    return sourcePath;
  }
  const capabilities = await mediaCapabilities();
  if (!capabilities.heic) {
    throw mediaError("MEDIA_UNSUPPORTED_FORMAT", 415, {
      message: "HEIC fotoğraf desteği şu anda kullanılamıyor. Fotoğrafı JPG olarak dışa aktarıp tekrar deneyin.",
    });
  }
  const normalizedPath = path.join(workPath, "heic-source.png");
  await decodeHeicToPng({
    sourcePath,
    destinationPath: normalizedPath,
    maxPixels: profile.maxPixels,
  });
  return normalizedPath;
}

async function processImage(asset, sourcePath, workPath, relativePrefix) {
  const policy = getPurposePolicy(asset.purpose);
  const profile = policy.profile;
  const inputPath = await normalizeImageInput(asset, sourcePath, workPath, profile);
  let metadata;
  try {
    metadata = await sharp(inputPath, {
      failOn: "warning",
      limitInputPixels: profile.maxPixels,
    }).metadata();
  } catch (error) {
    throw mediaError("MEDIA_CORRUPT", 422, { details: { processor: "image" } });
  }
  const dimensions = orientedDimensions(metadata);
  const pixels = Number(dimensions.width) * Number(dimensions.height);
  if (!dimensions.width || !dimensions.height || pixels > profile.maxPixels) {
    throw mediaError("MEDIA_FILE_TOO_LARGE", 413, {
      message: "Fotoğrafın çözünürlüğü işleme sınırını aşıyor.",
      details: { maxPixels: profile.maxPixels, actualPixels: pixels || null },
    });
  }

  const variants = [];
  const widths = targetImageWidths(profile, dimensions.width, dimensions.height);
  for (const width of widths) {
    const fileName = `w${width}.webp`;
    const outputPath = path.join(workPath, fileName);
    const generated = await writeImageVariant({
      inputPath,
      outputPath,
      width,
      profile,
      format: "webp",
    });
    variants.push(
      outputVariant({
        relativeKey: path.posix.join(relativePrefix, fileName),
        name: `w${generated.metadata.width}`,
        kind: MEDIA_KINDS.IMAGE,
        format: "webp",
        mime: "image/webp",
        stats: generated.stats,
        metadata: generated.metadata,
      })
    );
  }

  if (profile.jpegFallbackWidth) {
    const fallbackWidth = Math.min(profile.jpegFallbackWidth, dimensions.width);
    const fileName = "fallback.jpg";
    const generated = await writeImageVariant({
      inputPath,
      outputPath: path.join(workPath, fileName),
      width: fallbackWidth,
      profile,
      format: "jpeg",
    });
    variants.push(
      outputVariant({
        relativeKey: path.posix.join(relativePrefix, fileName),
        name: "fallback",
        kind: MEDIA_KINDS.IMAGE,
        format: "jpeg",
        mime: "image/jpeg",
        stats: generated.stats,
        metadata: generated.metadata,
      })
    );
  }

  if (inputPath !== sourcePath) await fsp.rm(inputPath, { force: true });
  const webpVariants = variants.filter((variant) => variant.format === "webp");
  const primary = webpVariants.at(-1);
  return {
    variants,
    primaryVariant: primary?.name || variants[0]?.name || "",
    metadata: {
      width: dimensions.width,
      height: dimensions.height,
      durationSeconds: null,
      codec: metadata.format || "",
      colorSpace: metadata.space || "",
      hdr: false,
      hasAudio: false,
    },
  };
}

async function probeVideo(filePath) {
  const result = await runCommand(
    FFPROBE_PATH,
    [
      "-v",
      "error",
      "-show_entries",
      "stream=index,codec_type,codec_name,width,height,pix_fmt,color_space,color_transfer,color_primaries,bit_rate:format=duration,bit_rate,format_name",
      "-of",
      "json",
      filePath,
    ],
    { timeoutMs: 30_000 }
  );
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw mediaError("MEDIA_CORRUPT", 422);
  }
}

function isHdrVideo(stream) {
  return (
    ["smpte2084", "arib-std-b67"].includes(String(stream.color_transfer || "")) ||
    String(stream.color_primaries || "") === "bt2020"
  );
}

function doubleBitrate(value) {
  const match = /^(\d+)([kKmM]?)$/.exec(String(value));
  if (!match) return value;
  return `${Number(match[1]) * 2}${match[2]}`;
}

function videoFilter({ width, height, hdr, hdrToneMap }) {
  const scale = `scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2`;
  if (hdr && hdrToneMap) {
    return [
      "zscale=t=linear:npl=100",
      "format=gbrpf32le",
      "zscale=p=bt709",
      "tonemap=hable:desat=0",
      "zscale=t=bt709:m=bt709:r=tv",
      scale,
      "fps=30",
      "format=yuv420p",
      "setsar=1",
    ].join(",");
  }
  const filters = [];
  if (hdr) filters.push("colorspace=all=bt709:format=yuv420p:fast=1");
  filters.push(scale, "fps=30", "format=yuv420p", "setsar=1");
  return filters.join(",");
}

async function createVideoVariant({
  sourcePath,
  outputPath,
  variant,
  keepAudio,
  hdr,
  hdrToneMap,
}) {
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-nostdin",
    "-y",
    "-i",
    sourcePath,
    "-map",
    "0:v:0",
  ];
  if (keepAudio) args.push("-map", "0:a:0?");
  args.push(
    "-vf",
    videoFilter({ width: variant.width, height: variant.height, hdr, hdrToneMap }),
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "22",
    "-maxrate",
    variant.videoBitrate,
    "-bufsize",
    doubleBitrate(variant.videoBitrate),
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "high",
    "-tag:v",
    "avc1",
    "-threads",
    String(VIDEO_THREADS)
  );
  if (keepAudio) args.push("-c:a", "aac", "-b:a", "128k");
  else args.push("-an");
  args.push(
    "-map_metadata",
    "-1",
    "-map_chapters",
    "-1",
    "-movflags",
    "+faststart",
    outputPath
  );
  await runCommand(FFMPEG_PATH, args, { timeoutMs: VIDEO_TIMEOUT_MS });
}

async function processVideo(asset, sourcePath, workPath, relativePrefix) {
  const capabilities = await mediaCapabilities();
  if (!capabilities.ffmpeg || !capabilities.ffprobe || !capabilities.h264Encode) {
    throw mediaError("MEDIA_PROCESSING_FAILED", 503, {
      message: "Video işleyici şu anda hazır değil. Dosyanız korunuyor; kısa süre sonra tekrar deneyin.",
    });
  }
  const policy = getPurposePolicy(asset.purpose);
  const profile = policy.profile;
  let probe;
  try {
    probe = await probeVideo(sourcePath);
  } catch (error) {
    if (error instanceof MediaError) throw error;
    throw mediaError("MEDIA_CORRUPT", 422);
  }
  const videoStream = (probe.streams || []).find((stream) => stream.codec_type === "video");
  const audioStream = (probe.streams || []).find((stream) => stream.codec_type === "audio");
  if (!videoStream) throw mediaError("MEDIA_UNSUPPORTED_FORMAT", 415);
  if (/^prores/i.test(String(videoStream.codec_name || ""))) {
    throw mediaError("MEDIA_PRORES_UNSUPPORTED", 415);
  }
  const durationSeconds = Number(probe.format?.duration || 0);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw mediaError("MEDIA_CORRUPT", 422);
  }
  if (durationSeconds > profile.maxDurationSeconds + 0.25) {
    throw mediaError("MEDIA_DURATION_EXCEEDED", 413, {
      details: {
        maxDurationSeconds: profile.maxDurationSeconds,
        actualDurationSeconds: durationSeconds,
      },
    });
  }
  const pixels = Number(videoStream.width) * Number(videoStream.height);
  if (!pixels || pixels > VIDEO_MAX_PIXELS) {
    throw mediaError("MEDIA_FILE_TOO_LARGE", 413, {
      message: "Videonun çözünürlüğü işleme sınırını aşıyor.",
    });
  }

  const hdr = isHdrVideo(videoStream);
  const variants = [];
  for (const profileVariant of profile.variants) {
    const fileName = `${profileVariant.name}.mp4`;
    const outputPath = path.join(workPath, fileName);
    try {
      await createVideoVariant({
        sourcePath,
        outputPath,
        variant: profileVariant,
        keepAudio: profile.keepAudio,
        hdr,
        hdrToneMap: capabilities.hdrToneMap,
      });
    } catch (error) {
      throw mediaError("MEDIA_PROCESSING_FAILED", 422, {
        details: { processor: "video", reason: String(error?.code || "ffmpeg") },
      });
    }
    const [stats, outputProbe] = await Promise.all([fsp.stat(outputPath), probeVideo(outputPath)]);
    const stream = (outputProbe.streams || []).find((item) => item.codec_type === "video") || {};
    variants.push(
      outputVariant({
        relativeKey: path.posix.join(relativePrefix, fileName),
        name: profileVariant.name,
        kind: MEDIA_KINDS.VIDEO,
        format: "mp4",
        mime: "video/mp4",
        stats,
        metadata: {
          width: stream.width,
          height: stream.height,
          durationSeconds: Number(outputProbe.format?.duration || durationSeconds),
          bitrate: Number(stream.bit_rate || outputProbe.format?.bit_rate || 0) || null,
        },
      })
    );
  }

  const posterSource = path.join(workPath, "poster-source.jpg");
  const posterAt = Math.max(0, Math.min(1, durationSeconds / 3));
  await runCommand(
    FFMPEG_PATH,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-nostdin",
      "-y",
      "-ss",
      String(posterAt),
      "-i",
      sourcePath,
      "-frames:v",
      "1",
      "-vf",
      "scale=1920:1920:force_original_aspect_ratio=decrease:force_divisible_by=2",
      "-q:v",
      "2",
      posterSource,
    ],
    { timeoutMs: 90_000 }
  );
  const posterMetadata = await sharp(posterSource).metadata();
  const posterProfile = {
    widths: profile.posterWidths,
    maxPixels: VIDEO_MAX_PIXELS,
    masterWidth: Math.max(...profile.posterWidths),
    quality: 82,
    square: false,
  };
  for (const width of targetImageWidths(posterProfile, posterMetadata.width, posterMetadata.height)) {
    const fileName = `poster-w${width}.webp`;
    const generated = await writeImageVariant({
      inputPath: posterSource,
      outputPath: path.join(workPath, fileName),
      width,
      profile: posterProfile,
      format: "webp",
    });
    variants.push(
      outputVariant({
        relativeKey: path.posix.join(relativePrefix, fileName),
        name: `poster-w${generated.metadata.width}`,
        kind: MEDIA_KINDS.IMAGE,
        format: "webp",
        mime: "image/webp",
        stats: generated.stats,
        metadata: generated.metadata,
      })
    );
  }
  await fsp.rm(posterSource, { force: true });

  return {
    variants,
    primaryVariant: profile.variants.at(-1)?.name || variants[0]?.name || "",
    metadata: {
      width: Number(videoStream.width),
      height: Number(videoStream.height),
      durationSeconds,
      codec: String(videoStream.codec_name || ""),
      colorSpace: String(videoStream.color_space || ""),
      hdr,
      hasAudio: Boolean(audioStream),
    },
  };
}

async function processMediaAsset(asset, jobId) {
  const policy = getPurposePolicy(asset.purpose);
  if (!policy || policy.kind !== asset.kind) {
    throw mediaError("MEDIA_UNSUPPORTED_PURPOSE", 422);
  }
  const sourcePath = absolutePathForKey(asset.original.stagingKey);
  const workKey = processingKeyForAsset(String(asset._id), String(jobId));
  const workPath = absolutePathForKey(workKey);
  const destinationKey = assetDirectoryKey(asset.purpose, String(asset._id));
  const destinationPath = absolutePathForKey(destinationKey);
  const relativePrefix = path.posix.join(asset.purpose, String(asset._id));
  await ensureEmptyDirectory(workPath);

  try {
    const result =
      asset.kind === MEDIA_KINDS.IMAGE
        ? await processImage(asset, sourcePath, workPath, relativePrefix)
        : await processVideo(asset, sourcePath, workPath, relativePrefix);
    const manifestKey = path.posix.join(relativePrefix, "manifest.json");
    const manifest = {
      schemaVersion: 1,
      assetId: String(asset._id),
      purpose: asset.purpose,
      kind: asset.kind,
      sourceChecksumSha256: asset.original.checksumSha256,
      generatedAt: new Date().toISOString(),
      metadata: result.metadata,
      primaryVariant: result.primaryVariant,
      variants: result.variants.map((variant) => ({
        name: variant.name,
        kind: variant.kind,
        format: variant.format,
        key: variant.key,
        bytes: variant.bytes,
        width: variant.width,
        height: variant.height,
        durationSeconds: variant.durationSeconds,
      })),
    };
    await fsp.writeFile(
      path.join(workPath, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      { encoding: "utf8", mode: 0o640 }
    );
    await fsp.rm(destinationPath, { recursive: true, force: true });
    await atomicMoveDirectory(workPath, destinationPath);
    return { ...result, manifestKey };
  } catch (error) {
    await removeKey(workKey).catch(() => {});
    throw error;
  }
}

module.exports = { processMediaAsset, probeVideo };
