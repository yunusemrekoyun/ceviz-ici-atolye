import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BellPlus } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/get-session';
import { paramsToChips, paramsToQuery } from '@/lib/search-params-label';
import { SavedSearchCard } from '@/components/account/saved-search-card';
import { SectionHeading } from '@/components/site/section-heading';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Kayıtlı Aramalarım' };

const dateFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });

export default async function Page() {
  const session = await getServerSession();
  if (!session) redirect('/giris?callbackURL=/hesap/aramalarim');

  const searches = await prisma.savedSearch.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="container py-12 lg:py-16">
      <SectionHeading
        eyebrow="Hesabım"
        title="Kayıtlı Aramalarım"
        subtitle="Kriterlerinize uyan yeni ilan yayınlandığında her sabah tek e-postayla haber veririz."
      />

      <div className="mt-8 max-w-3xl space-y-3">
        {searches.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-10 text-center shadow-soft-sm">
            <BellPlus className="mx-auto h-8 w-8 text-brass-strong" aria-hidden="true" />
            <h3 className="mt-3 font-heading text-lg font-semibold text-foreground">
              Kayıtlı aramanız yok
            </h3>
            <p className="mx-auto mt-2 max-w-sm leading-relaxed text-muted-foreground">
              İlanlar sayfasında filtrelerinizi seçip &quot;Aramayı kaydet&quot; deyin; yeni
              eşleşmeleri sabah e-postasıyla alın.
            </p>
            <Button asChild variant="brass" className="mt-6">
              <Link href="/ilanlar">İlanlara Göz At</Link>
            </Button>
          </div>
        ) : (
          searches.map((s) => {
            const params = s.params as Record<string, string>;
            return (
              <SavedSearchCard
                key={s.id}
                id={s.id}
                name={s.name}
                query={paramsToQuery(params)}
                chips={paramsToChips(params)}
                createdAt={dateFmt.format(s.createdAt)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
