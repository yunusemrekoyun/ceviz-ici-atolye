import { Inbox } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Card, StatusPill } from '@/components/admin/ui';
import { CloseComplaintButton } from '@/components/admin/complaint-row';

const dateFmt = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

export default async function AdminComplaintsPage() {
  const complaints = await prisma.complaint.findMany({
    include: { reporter: { select: { name: true, email: true } } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });

  const listingTitles = new Map<string, string>();
  const listingIds = [...new Set(complaints.map((c) => c.listingId).filter(Boolean))] as string[];
  if (listingIds.length) {
    const rows = await prisma.listing.findMany({
      where: { id: { in: listingIds } },
      select: { id: true, title: true },
    });
    for (const r of rows) listingTitles.set(r.id, r.title);
  }

  return (
    <Card title={`Şikayetler (${complaints.length})`}>
      <p className="mb-4 text-xs text-[#8A6A43]">
        Gizlilik gereği yazışma içerikleri görünmez — yalnızca şikayetçinin gerekçesi ve eklediği
        ekran görüntüleri listelenir.
      </p>
      {complaints.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-sm text-[#4b5b47]">
          <Inbox size={40} className="text-[#85AB8B]" />
          Şikayet yok.
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <article
              key={c.id}
              className="rounded-2xl border border-[#D9E3D5] bg-white p-4 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill
                  label={c.status === 'acik' ? 'Açık' : 'Kapatıldı'}
                  tone={c.status === 'acik' ? 'warning' : 'muted'}
                />
                <span className="font-medium text-[#1f2a1d]">{c.reporter.name}</span>
                <span className="text-[#4b5b47]">({c.reporter.email})</span>
                {c.listingId ? (
                  <span className="text-[#4b5b47]">
                    · {listingTitles.get(c.listingId) ?? 'İlan silinmiş'}
                  </span>
                ) : null}
                <span className="ml-auto text-xs text-[#4b5b47]">
                  {dateFmt.format(c.createdAt)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap leading-relaxed text-[#1f2a1d]">{c.reason}</p>
              {c.images.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.images.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt="Şikayet ekran görüntüsü"
                        className="h-24 w-24 rounded-xl border border-[#D9E3D5] object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : null}
              {c.status === 'acik' ? (
                <div className="mt-3">
                  <CloseComplaintButton complaintId={c.id} />
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
