import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { mediaConfig, extensionForMime } from '@/lib/media/config';
import { saveFile } from '@/lib/media/storage';
import { processImage } from '@/lib/media/processor';

export const runtime = 'nodejs';

/**
 * Global media upload endpoint.
 * Accepts FormData with:
 *   - file: the uploaded file
 *   - entityType: e.g. "room_type"
 *   - entityId: the ID of the parent entity
 */
export async function POST(request: NextRequest) {
  try {
    const authContext = await getAuthContextFromRequest(request);
    if (!authContext || authContext.user.roleSlug !== 'admin') {
      return NextResponse.json(
        { ok: false, message: 'Yetkisiz erişim.' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const entityType = formData.get('entityType') as string | null;
    const entityId = formData.get('entityId') as string | null;

    if (!file || !entityType || !entityId) {
      return NextResponse.json(
        { ok: false, message: 'Dosya, entityType ve entityId zorunludur.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > mediaConfig.maxFileSize) {
      return NextResponse.json(
        { ok: false, message: 'Dosya boyutu 20MB\'ı aşamaz.' },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!mediaConfig.allowedTypes.includes(file.type as any)) {
      return NextResponse.json(
        { ok: false, message: 'Desteklenmeyen dosya formatı.' },
        { status: 400 }
      );
    }

    // Extension is derived from the validated MIME type, never the user's
    // filename (which could carry path separators / traversal).
    const ext = extensionForMime(file.type);
    if (!ext) {
      return NextResponse.json(
        { ok: false, message: 'Desteklenmeyen dosya formatı.' },
        { status: 400 }
      );
    }
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const fileName = `${uniqueId}.${ext}`;

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save original
    const relativePath = await saveFile(buffer, fileName, mediaConfig.variants.originals);

    // Count existing media for sort order
    const existingCount = await prisma.media.count({
      where: { entityType, entityId },
    });

    // Create DB record
    const media = await prisma.media.create({
      data: {
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        pathOriginal: relativePath,
        entityType,
        entityId,
        sortOrder: existingCount,
      },
    });

    // Process synchronously — client gets back the fully processed record
    await processImage(media.id);
    const processed = await prisma.media.findUnique({ where: { id: media.id } });

    return NextResponse.json({ ok: true, media: processed ?? media }, { status: 201 });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { ok: false, message: 'Medya yüklenirken hata oluştu.' },
      { status: 500 }
    );
  }
}
