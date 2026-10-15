import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, LandPlot, Plus } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/get-session';
import { authErrorMessage } from '@/lib/auth-errors';
import { STATUS_LABELS } from '@/lib/mappers';
import type { ListingStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/site/section-heading';

export const metadata: Metadata = {
  title: 'Hesabım',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await getServerSession();
  if (!session) redirect('/giris?callbackURL=/hesap');

  const grouped = await prisma.listing.groupBy({
    by: ['status'],
    where: { ownerId: session.user.id },
    _count: true,
  });
  const counts = new Map(grouped.map((g) => [g.status, g._count]));
  const total = grouped.reduce((n, g) => n + g._count, 0);
  const ORDER: ListingStatus[] = ['incelemede', 'cekimBekliyor', 'aktif', 'reddedildi'];

  return (
    <div className="container py-12 lg:py-16">
      <SectionHeading
        eyebrow="Hesabım"
        title={`Hoş geldiniz, ${session.user.name ?? ''}`}
        subtitle={session.user.email}
      />

      {error ? (
        <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {authErrorMessage(error)} Bağlantı zaten kullanılmış olabilir — giriş yapmayı deneyin.
        </p>
      ) : null}

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft-sm sm:p-8">
          <h2 className="flex items-center gap-2.5 font-heading text-lg font-semibold text-foreground">
            <LandPlot className="h-5 w-5 text-brass-strong" aria-hidden="true" />
            İlanlarım
          </h2>

          {total === 0 ? (
            <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">
              Henüz ilan başvurunuz yok. Arazinizi birkaç dakikada ücretsiz ilana verin.
            </p>
          ) : (
            <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {ORDER.filter((s) => counts.get(s)).map((s) => (
                <div key={s} className="rounded-md border border-border bg-background p-4">
                  <dd className="nums font-heading text-2xl font-bold text-foreground">
                    {counts.get(s)}
                  </dd>
                  <dt className="mt-1 text-[13px] text-muted-foreground">
                    {STATUS_LABELS[s].label}
                  </dt>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="brass">
              <Link href="/ilan-ver">
                <Plus className="h-4 w-4" />
                İlan Ver
              </Link>
            </Button>
            {total > 0 ? (
              <Button asChild variant="outline">
                <Link href="/hesap/ilanlarim">
                  İlanlarımı Yönet
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/hesap/mesajlar">
                Mesajlarım
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/hesap/favoriler">
                Favorilerim
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/hesap/aramalarim">
                Kayıtlı Aramalarım
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <aside className="rounded-lg border border-border bg-muted p-6">
          <h2 className="font-heading text-[16px] font-semibold text-foreground">
            Yakında hesabınızda
          </h2>
          <ul className="mt-3 space-y-2 text-[14px] leading-relaxed text-muted-foreground"></ul>
        </aside>
      </div>
    </div>
  );
}
