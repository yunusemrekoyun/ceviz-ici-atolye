import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLegalDoc } from '@/lib/data';
import { isRichHtml } from '@/lib/sanitize';

export const dynamicParams = true;

const TITLES: Record<string, string> = {
  kvkk: 'KVKK Aydınlatma Metni',
  gizlilik: 'Gizlilik Politikası',
  cerez: 'Çerez Politikası',
  kosullar: 'Kullanım Koşulları',
  iys: 'Ticari Elektronik İleti Bilgilendirmesi',
};

export function generateStaticParams() {
  return Object.keys(TITLES).map((key) => ({ key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  const doc = await getLegalDoc(key);
  return {
    title: doc?.title || TITLES[key] || 'Yasal Bilgilendirme',
    robots: { index: false },
  };
}

export default async function Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const doc = await getLegalDoc(key);
  if (!doc && !TITLES[key]) notFound();

  const title = doc?.title || TITLES[key];
  const body = doc?.body ?? 'İçerik yakında eklenecektir.';

  return (
    <div className="container max-w-3xl py-12 lg:py-16">
      <p className="flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-brass-strong">
        <span className="h-0.5 w-8 bg-brass" aria-hidden="true" />
        Yasal Bilgilendirme
      </p>
      <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h1>
      {isRichHtml(body) ? (
        <div
          className="rich-body mt-8 text-[16px] leading-relaxed text-foreground/85"
          // Gövde kaydedilirken sunucuda sanitize edilir (sanitizeRichHtml)
          dangerouslySetInnerHTML={{ __html: body }}
        />
      ) : (
        <div className="mt-8 space-y-4 text-[16px] leading-relaxed text-foreground/85">
          {body.split(/\n{2,}/).map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
