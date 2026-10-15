import Link from 'next/link';
import { Camera, Inbox } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { STATUS_LABELS, TYPE_LABELS } from '@/lib/mappers';
import { Card, StatusPill, outlineBtn } from '@/components/admin/ui';
import { ModerationActions, PriceRequestActions } from '@/components/admin/moderation-row';

const dateFmt = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
});

export default async function AdminDashboard() {
  const [grouped, newLeads, pendingReview, awaitingShoot, priceRequests] = await Promise.all([
    prisma.listing.groupBy({ by: ['status'], _count: true }),
    prisma.lead.count({ where: { status: 'yeni' } }),
    prisma.listing.findMany({
      where: { status: 'incelemede' },
      include: { owner: { select: { name: true, email: true } } },
      orderBy: { updatedAt: 'asc' },
    }),
    prisma.listing.findMany({
      where: { status: 'cekimBekliyor' },
      include: { owner: { select: { name: true } } },
      orderBy: { updatedAt: 'asc' },
    }),
    prisma.listingPriceRequest.findMany({
      where: { status: 'bekliyor' },
      include: { listing: { select: { id: true, title: true, price: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const counts = new Map(grouped.map((g) => [g.status as string, g._count]));
  const counters = [
    { label: 'Yayında', value: counts.get('aktif') ?? 0, href: '/admin/ilanlar?durum=aktif' },
    {
      label: 'İncelemede',
      value: counts.get('incelemede') ?? 0,
      href: '/admin/ilanlar?durum=incelemede',
    },
    {
      label: 'Çekim Bekliyor',
      value: counts.get('cekimBekliyor') ?? 0,
      href: '/admin/ilanlar?durum=cekimBekliyor',
    },
    { label: 'Fiyat Talebi', value: priceRequests.length, href: '#fiyat-talepleri' },
    { label: 'Yeni Talep', value: newLeads, href: '/admin/talepler' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {counters.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-2xl border border-[#D9E3D5] bg-[#FAF7EF] p-4 transition-colors hover:border-[#3d5638]"
          >
            <span className="block text-2xl font-medium text-[#1f2a1d]">{c.value}</span>
            <span className="mt-0.5 block text-xs text-[#4b5b47]">{c.label}</span>
          </Link>
        ))}
      </div>

      <Card title={`Bekleyen Başvurular (${pendingReview.length})`}>
        {pendingReview.length === 0 ? (
          <EmptyNote text="İncelenecek başvuru yok." />
        ) : (
          <div className="space-y-4">
            {pendingReview.map((l) => (
              <article
                key={l.id}
                className="rounded-2xl border border-[#D9E3D5] bg-white p-4 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill
                    label={STATUS_LABELS[l.status].label}
                    tone={STATUS_LABELS[l.status].tone}
                  />
                  {l.droneRequested ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#8A6A43]/10 px-2.5 py-1 text-[11px] font-semibold text-[#8A6A43]">
                      <Camera size={12} />
                      Drone istendi
                    </span>
                  ) : null}
                  <span className="ml-auto text-xs text-[#4b5b47]">
                    {dateFmt.format(l.updatedAt)}
                  </span>
                </div>
                <h3 className="mt-2 font-medium text-[#1f2a1d]">{l.title}</h3>
                <p className="mt-1 text-[#4b5b47]">
                  {l.district} · {TYPE_LABELS[l.type]} · {l.area} · {l.price}
                </p>
                <p className="mt-1 text-[#4b5b47]">
                  Sahibi: <span className="text-[#1f2a1d]">{l.owner.name}</span> ({l.owner.email}) ·
                  Konum: {l.location}
                </p>
                <p className="mt-2 line-clamp-3 leading-relaxed text-[#4b5b47]">{l.description}</p>
                <ModerationActions listingId={l.id} />
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card title={`Çekim Bekleyenler (${awaitingShoot.length})`}>
        {awaitingShoot.length === 0 ? (
          <EmptyNote text="Çekim bekleyen ilan yok." />
        ) : (
          <div className="space-y-3">
            {awaitingShoot.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#D9E3D5] bg-white p-4 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-[#1f2a1d]">{l.title}</h3>
                  <p className="mt-0.5 text-[#4b5b47]">
                    {l.district} · {l.owner.name}
                    {l.droneRequested ? ' · Drone istendi' : ''}
                  </p>
                </div>
                <Link href={`/admin/ilanlar/${l.id}`} className={outlineBtn}>
                  Yayına Hazırla
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div id="fiyat-talepleri">
        <Card title={`Fiyat Talepleri (${priceRequests.length})`}>
          {priceRequests.length === 0 ? (
            <EmptyNote text="Bekleyen fiyat talebi yok." />
          ) : (
            <div className="space-y-3">
              {priceRequests.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-[#D9E3D5] bg-white p-4 text-sm"
                >
                  <h3 className="font-medium text-[#1f2a1d]">{r.listing.title}</h3>
                  <p className="mt-1 text-[#4b5b47]">
                    <span className="line-through">{r.listing.price}</span>
                    <span className="mx-2 text-[#1f2a1d]">→</span>
                    <span className="font-medium text-[#3d5638]">{r.requestedPrice}</span>
                    <span className="ml-3 text-xs">{dateFmt.format(r.createdAt)}</span>
                  </p>
                  {r.note ? <p className="mt-1 text-[#4b5b47]">Not: {r.note}</p> : null}
                  <div className="mt-3">
                    <PriceRequestActions requestId={r.id} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function EmptyNote({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-sm text-[#4b5b47]">
      <Inbox size={32} className="text-[#85AB8B]" />
      {text}
    </div>
  );
}
