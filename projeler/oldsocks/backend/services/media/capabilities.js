const { runCommand } = require("./processRunner");

const FFMPEG_PATH = String(process.env.FFMPEG_PATH || "ffmpeg");
const FFPROBE_PATH = String(process.env.FFPROBE_PATH || "ffprobe");
let cached;

async function commandWorks(command, args) {
  try {
    await runCommand(command, args, { timeoutMs: 10_000 });
    return true;
  } catch {
    return false;
  }
}

async function mediaCapabilities({ refresh = false } = {}) {
  if (cached && !refresh) return cached;
  const [ffmpeg, ffprobe] = await Promise.all([
    commandWorks(FFMPEG_PATH, ["-version"]),
    commandWorks(FFPROBE_PATH, ["-version"]),
  ]);
  let filters = "";
  let decoders = "";
  let encoders = "";
  if (ffmpeg) {
    const [filterResult, decoderResult, encoderResult] = await Promise.all([
      runCommand(FFMPEG_PATH, ["-hide_banner", "-filters"], { timeoutMs: 10_000 }),
      runCommand(FFMPEG_PATH, ["-hide_banner", "-decoders"], { timeoutMs: 10_000 }),
      runCommand(FFMPEG_PATH, ["-hide_banner", "-encoders"], { timeoutMs: 10_000 }),
    ]);
    filters = `${filterResult.stdout}\n${filterResult.stderr}`;
    decoders = `${decoderResult.stdout}\n${decoderResult.stderr}`;
    encoders = `${encoderResult.stdout}\n${encoderResult.stderr}`;
  }
  let heic = false;
  try {
    require.resolve("heic-decode");
    heic = true;
  } catch {
    heic = false;
  }

  cached = Object.freeze({
    ffmpeg,
    ffprobe,
    heic,
    hevcDecode: /\bhevc\b/i.test(decoders),
    h264Encode: /\blibx264\b/i.test(encoders),
    aacEncode: /^\s*A\S*\s+aac\s/im.test(encoders),
    hdrToneMap: /\bzscale\b/i.test(filters) && /\btonemap\b/i.test(filters),
  });
  return cached;
}

module.exports = { FFMPEG_PATH, FFPROBE_PATH, mediaCapabilities };
