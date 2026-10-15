import Link from 'next/link';
import { CircleCheck, Eye, Plus } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { STATUS_LABELS, TYPE_LABELS } from '@/lib/mappers';
import type { ListingStatus } from '@prisma/client';
import { Card, StatusPill, primaryBtn } from '@/components/admin/ui';
import { thumbUrl } from '@/lib/img';
import { cn } from '@/lib/utils';

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Tümü' },
  { value: 'aktif', label: 'Yayında' },
  { value: 'incelemede', label: 'İncelemede' },
  { value: 'cekimBekliyor', label: 'Çekim Bekliyor' },
  { value: 'satildi', label: 'Satıldı' },
  { value: 'kiralandi', label: 'Kiralandı' },
  { value: 'pasif', label: 'Pasif' },
  { value: 'reddedildi', label: 'Reddedildi' },
  { value: 'taslak', label: 'Taslak' },
];

const VALID_STATUSES = FILTERS.map((f) => f.value).filter(Boolean);

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; kayit?: string; silindi?: string }>;
}) {
  const { durum, kayit, silindi } = await searchParams;
  const statusFilter = VALID_STATUSES.includes(durum ?? '') ? (durum as ListingStatus) : undefined;

  const listings = await prisma.listing.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    include: {
      media: { where: { type: 'image' }, orderBy: { position: 'asc' }, take: 1 },
      owner: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="space-y-4">
      {kayit || silindi ? (
        <p className="flex items-center gap-2 rounded-2xl border border-[#D9E3D5] bg-[#FAF7EF] px-4 py-3 text-sm text-[#3d5638]">
          <CircleCheck size={16} />
          {silindi ? 'İlan silindi.' : 'İlan kaydedildi.'}
        </p>
      ) : null}

      <Card
        title={`İlanlar (${listings.length})`}
        actions={
          <Link href="/admin/ilanlar/yeni" className={primaryBtn}>
            <Plus size={15} />
            Yeni İlan
          </Link>
        }
      >
        <div className="mb-4 flex gap-1 overflow-x-auto">
          {FILTERS.map((f) => {
            const active = (durum ?? '') === f.value;
            return (
              <Link
                key={f.value}
                href={f.value ? `/admin/ilanlar?durum=${f.value}` : '/admin/ilanlar'}
                className={cn(
                  'whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors',
                  active ? 'bg-[#3d5638] text-[#FAF7EF]' : 'text-[#2d3a2a] hover:bg-[#1f2a1d]/5',
                )}
              >
                {f.label}
              </Link>
            );
          })}
        </div>

        {listings.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#4b5b47]">Bu durumda ilan yok.</p>
        ) : (
          <div className="space-y-3">
            {listings.map((l) => {
              const cover = thumbUrl(
                (l.media[0]?.variants as { url?: string }[] | null)?.[0]?.url ?? null,
              );
              return (
                <Link
                  key={l.id}
                  href={`/admin/ilanlar/${l.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-[#D9E3D5] bg-white p-3 text-sm transition-colors hover:border-[#3d5638]"
                >
                  <span className="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-[#F4EFE6]">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-[#1f2a1d]">{l.title}</span>
                    <span className="mt-0.5 block text-[#4b5b47]">
                      {l.district} · {TYPE_LABELS[l.type]} · {l.area} · {l.price} · {l.owner.name}
                    </span>
                  </span>
                  <span className="hidden items-center gap-1 text-xs text-[#4b5b47] sm:inline-flex">
                    <Eye size={13} />
                    {l.viewCount}
                  </span>
                  <StatusPill
                    label={STATUS_LABELS[l.status].label}
                    tone={STATUS_LABELS[l.status].tone}
                  />
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
