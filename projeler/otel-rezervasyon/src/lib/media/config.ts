import path from 'path';

export type MediaStorageMode = 'local' | 'vps';

export const mediaConfig = {
  /** 'local' writes to public/uploads/, 'vps' will write to remote (future) */
  storageMode: (process.env.MEDIA_STORAGE || 'local') as MediaStorageMode,

  /** Root dir for local uploads (relative to project root) */
  localRoot: path.join(process.cwd(), 'public', 'uploads'),

  /** Sub-folders for each processed size variant */
  variants: {
    originals: 'originals',
    thumb: 'thumb',     // 200px wide, 60% quality
    medium: 'medium',   // 800px wide, 80% quality
    large: 'large',     // 1600px wide, 90% quality
  },

  /** Max upload file size in bytes (20 MB) */
  maxFileSize: 20 * 1024 * 1024,

  /** Allowed MIME types */
  allowedImageTypes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
  ],

  allowedVideoTypes: [
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ],

  get allowedTypes() {
    return [...this.allowedImageTypes, ...this.allowedVideoTypes];
  },

  /** Sharp processing presets */
  processing: {
    thumb:  { width: 200,  quality: 60 },
    medium: { width: 800,  quality: 80 },
    large:  { width: 1600, quality: 90 },
  },
} as const;

/** URL prefix for serving local media */
export function getMediaUrl(relativePath: string): string {
  return `/uploads/${relativePath}`;
}

// Derive the stored extension from the validated MIME type — never from the
// user-supplied filename (which could inject path separators). Returns null for
// a MIME that isn't on the allowlist.
const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

export function extensionForMime(mime: string): string | null {
  return MIME_EXTENSION[mime] ?? null;
}

export function isImageMime(mime: string): boolean {
  return mediaConfig.allowedImageTypes.includes(mime as any);
}

export function isVideoMime(mime: string): boolean {
  return mediaConfig.allowedVideoTypes.includes(mime as any);
}
