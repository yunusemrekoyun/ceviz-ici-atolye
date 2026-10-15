import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CircleCheck } from 'lucide-react';
import { getServerSession } from '@/lib/get-session';
import { getSiteChrome } from '@/lib/data';
import { SectionHeading } from '@/components/site/section-heading';
import { ListingApplicationForm } from '@/components/account/listing-application-form';
import { createListingApplication } from './actions';

export const metadata: Metadata = {
  title: 'İlan Ver',
};

const STEPS = [
  'Arazinizin temel bilgileriyle başvurun',
  'Ekibimiz bilgileri inceleyip onaylasın',
  'Sahada fotoğraf (istediyseniz drone) çekimi yapılır',
  'Arazi bilgileri doğrulanır ve ilanınız yayına alınır',
];

export default async function Page() {
  const session = await getServerSession();
  if (!session) redirect('/giris?callbackURL=/ilan-ver');

  const chrome = await getSiteChrome();
  const districts = chrome.districts.map((d) => d.name);

  return (
    <div className="container py-12 lg:py-16">
      <SectionHeading
        eyebrow="İlan Başvurusu"
        title="Arazinizi ücretsiz ilana verin"
        subtitle="Yalnızca temel bilgiler yeterli — fotoğraf ve arazi bilgilerini ekibimiz sahada tamamlar."
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="rounded-lg border border-border bg-card p-5 shadow-soft sm:p-8">
          <ListingApplicationForm action={createListingApplication} districts={districts} />
        </div>

        <aside className="lg:pt-2">
          <h2 className="flex items-center gap-2.5 font-heading text-lg font-semibold text-foreground">
            <span className="h-4 w-0.5 shrink-0 bg-brass" aria-hidden="true" />
            Nasıl işler?
          </h2>
          <ol className="mt-4 space-y-4">
            {STEPS.map((s, i) => (
              <li
                key={s}
                className="flex items-start gap-3 text-[15px] leading-relaxed text-foreground/85"
              >
                <span className="nums mt-0.5 font-heading text-sm font-bold text-brass-strong">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {s}
              </li>
            ))}
          </ol>
          <p className="mt-6 flex items-start gap-2.5 rounded-lg border border-border bg-muted p-4 text-[14px] leading-relaxed text-muted-foreground">
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-brass-strong" aria-hidden="true" />
            Başvurunuzun durumunu Hesabım → İlanlarım sayfasından takip edebilirsiniz.
          </p>
        </aside>
      </div>
    </div>
  );
}
