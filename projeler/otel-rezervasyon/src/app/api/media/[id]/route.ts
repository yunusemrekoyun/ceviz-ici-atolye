import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { deleteFile } from '@/lib/media/storage';

export const runtime = 'nodejs';

/** DELETE: Remove a media record and its files (admin only) */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthContextFromRequest(request);
    if (!authContext || authContext.user.roleSlug !== 'admin') {
      return NextResponse.json(
        { ok: false, message: 'Yetkisiz erişim.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const media = await prisma.media.findUnique({ where: { id } });

    if (!media) {
      return NextResponse.json(
        { ok: false, message: 'Medya bulunamadı.' },
        { status: 404 }
      );
    }

    // Delete all file variants
    const pathsToDelete = [
      media.pathOriginal,
      media.pathThumb,
      media.pathMedium,
      media.pathLarge,
    ].filter(Boolean) as string[];

    await Promise.all(pathsToDelete.map(deleteFile));

    // Delete DB record
    await prisma.media.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Media delete error:', error);
    return NextResponse.json(
      { ok: false, message: 'Medya silinirken hata oluştu.' },
      { status: 500 }
    );
  }
}
