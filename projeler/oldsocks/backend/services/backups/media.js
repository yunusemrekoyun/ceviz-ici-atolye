const fs = require("node:fs/promises");
const path = require("node:path");

function safeSegment(value) {
  return value !== "." && value !== ".." && /^[A-Za-z0-9._-]+$/.test(value);
}

async function verifyMediaTree(stage) {
  const result = { files: 0, bytes: 0 };
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (!safeSegment(entry.name)) throw new Error("Backup media path is unsafe");
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(file);
      } else if (entry.isFile()) {
        const info = await fs.lstat(file);
        if (!info.isFile()) throw new Error("Backup media path changed during verification");
        result.files += 1;
        result.bytes += info.size;
      } else {
        throw new Error("Backup media contains a link or unsupported file type");
      }
    }
  }
  for (const folder of ["assets", "trash", "quarantine"]) {
    const root = path.join(stage, "media", folder);
    const info = await fs.lstat(root);
    if (!info.isDirectory()) throw new Error("Backup media folder is invalid");
    await walk(root);
  }
  return result;
}

async function verifyMediaInStage(archive, stage) {
  const media = archive.collections.find((collection) => collection.name === "mediaassets");
  if (!media || !Array.isArray(media.documents)) {
    throw new Error("Backup has no media asset collection");
  }
  let readyAssets = 0;
  let referencedFiles = 0;
  for (const asset of media.documents) {
    if (asset.status !== "ready") continue;
    readyAssets += 1;
    if (!asset.manifestKey || !Array.isArray(asset.variants) || !asset.variants.length) {
      throw new Error("Ready media asset has no complete file manifest");
    }
    const keys = [asset.manifestKey, ...(asset.variants || []).map((variant) => variant.key)];
    for (const key of keys) {
      if (!key) throw new Error("Ready media asset has an empty file key");
      const parts = key.split("/");
      if (parts.some((part) => !safeSegment(part))) {
        throw new Error("Backup media key is unsafe");
      }
      const file = path.join(stage, "media", "assets", ...parts);
      const info = await fs.lstat(file);
      if (!info.isFile()) throw new Error("Backup media reference is not a regular file");
      referencedFiles += 1;
    }
  }
  return { readyAssets, referencedFiles };
}

module.exports = { verifyMediaInStage, verifyMediaTree };
