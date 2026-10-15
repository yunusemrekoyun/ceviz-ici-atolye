import { NextRequest, NextResponse } from 'next/server';
import { getAuthContextFromRequest } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { readEncryptedDocument } from '@/lib/private-documents';
import { writeAuditLog } from '@/lib/audit';

export const runtime = 'nodejs';

function contentDisposition(fileName: string) {
  const safe = fileName.replace(/["\r\n]/g, '_');
  return `inline; filename="${safe}"`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthContextFromRequest(request).catch(() => null);
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 });
  if (!['admin', 'personel'].includes(auth.user.roleSlug)) {
    return NextResponse.json({ ok: false, message: 'Yetkisiz.' }, { status: 403 });
  }

  const { id } = await params;
  const reservation = await prisma.reservation.findFirst({
    where: { OR: [{ id }, { confirmationId: id }] },
    select: {
      id: true,
      confirmationId: true,
      checkinDocumentPrivatePath: true,
      checkinDocumentOriginalName: true,
      checkinDocumentMimeType: true,
    },
  });

  if (!reservation?.checkinDocumentPrivatePath) {
    return NextResponse.json({ ok: false, message: 'Belge bulunamadı.' }, { status: 404 });
  }

  try {
    const buffer = await readEncryptedDocument(reservation.checkinDocumentPrivatePath);

    await writeAuditLog({
      request,
      auth,
      action: 'checkin_document.download',
      entityType: 'reservation',
      entityId: reservation.id,
      summary: `Check-in belgesi görüntülendi: #${reservation.confirmationId}`,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': reservation.checkinDocumentMimeType ?? 'application/octet-stream',
        'Content-Disposition': contentDisposition(reservation.checkinDocumentOriginalName ?? 'checkin-document'),
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Check-in document read failed.', error);
    return NextResponse.json({ ok: false, message: 'Belge okunamadı.' }, { status: 503 });
  }
}
