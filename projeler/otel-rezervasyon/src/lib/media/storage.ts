import fs from 'fs/promises';
import path from 'path';
import { mediaConfig } from './config';

/**
 * Ensures a directory exists, creating it recursively if needed.
 */
async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Save a buffer to local storage under the given variant folder.
 * Returns the relative path (e.g. "originals/abc123.webp").
 */
export async function saveFileLocal(
  buffer: Buffer,
  fileName: string,
  variant: string
): Promise<string> {
  const dir = path.join(mediaConfig.localRoot, variant);
  await ensureDir(dir);
  const filePath = path.join(dir, fileName);
  await fs.writeFile(filePath, buffer);
  return `${variant}/${fileName}`;
}

/**
 * Delete a file from local storage by its relative path.
 */
export async function deleteFileLocal(relativePath: string): Promise<void> {
  const fullPath = path.join(mediaConfig.localRoot, relativePath);
  try {
    await fs.unlink(fullPath);
  } catch (err: any) {
    // Ignore if already deleted
    if (err.code !== 'ENOENT') throw err;
  }
}

/**
 * High-level save: routes to local or VPS based on config.
 * For now only local is implemented; VPS is a future extension point.
 */
export async function saveFile(
  buffer: Buffer,
  fileName: string,
  variant: string
): Promise<string> {
  if (mediaConfig.storageMode === 'vps') {
    // Future: upload via SCP/SFTP/HTTP to VPS
    // For now, fall back to local
    console.warn('[media] VPS storage not yet implemented, falling back to local.');
  }
  return saveFileLocal(buffer, fileName, variant);
}

/**
 * High-level delete: routes to local or VPS based on config.
 */
export async function deleteFile(relativePath: string): Promise<void> {
  if (mediaConfig.storageMode === 'vps') {
    console.warn('[media] VPS storage not yet implemented, falling back to local.');
  }
  return deleteFileLocal(relativePath);
}
