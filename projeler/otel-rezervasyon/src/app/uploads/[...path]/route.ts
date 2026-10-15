import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { mediaConfig } from '@/lib/media/config';

export const runtime = 'nodejs';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

/**
 * Catch-all route to serve uploaded media files from the local filesystem.
 * Next.js standalone output does NOT serve public/ contents, so we need
 * this handler to make /uploads/... URLs work in production.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const segments = (await params).path;

  // Prevent directory traversal attacks
  if (segments.some(s => s === '..' || s.includes('\0'))) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const relativePath = segments.join('/');
  const fullPath = path.join(mediaConfig.localRoot, relativePath);

  // Double-check the resolved path stays within the uploads directory
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(path.resolve(mediaConfig.localRoot))) {
    return new NextResponse('Not Found', { status: 404 });
  }

  try {
    const buffer = await fs.readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse('Not Found', { status: 404 });
  }
}
