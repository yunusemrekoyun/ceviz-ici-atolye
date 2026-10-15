'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';
import { DetailActionBar } from '@/components/listings/detail-action-bar';
import { ParcelFrame, TopoLines } from '@/components/site/topo';
import { useParallax } from '@/lib/parallax';
import { useScrollScene } from '@/lib/use-scroll-scene';
import { imgSrcSet, thumbUrl } from '@/lib/img';
import { MessageCta } from './message-cta';
import { cn } from '@/lib/utils';
import { useStore, telLink, waLink } from '@/store';
import type { Listing } from '@/content';
import type { MapMarker } from '@/LeafletMap';

const LeafletMap = dynamic(() => import('@/LeafletMap'), { ssr: false });

/** Bölüm başlığı — brass ölçüm çubuğu motifiyle tutarlı alan etiketi. */
function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 font-heading text-lg font-semibold text-foreground">
      <span className="h-4 w-0.5 shrink-0 bg-brass" aria-hidden="true" />
      {children}
    </h2>
  );
}

// Her bölüm ekranda FARKLI bir konumda durur (hep aynı köşe değil) ve o konuma
// uygun bir yönden kayarak gelir. POS: yaslama sınıfı, DIR: geliş yönü (px).
// Sağ taraf kalıcı referans rayına ayrıldı (üstte başlık dock'u, altta özet).
// Bölümler sol tarafta, farklı yüksekliklerde durur; sağ rayla çakışmaz.
const POS = [
  'bottom-[13%] left-0', // A — alt-sol (bir kez gösterilip başlığa dönüşür)
  'top-[15%] left-0', // B — üst-sol
  'top-[41%] left-[2%]', // C — orta-sol
  'top-[17%] left-[3%]', // D — üst-sol
  'top-[46%] left-[6%]', // E — orta-sol
  'bottom-[15%] left-[4%]', // F — alt-sol
] as const;
const DIRS = [
  { dx: 0, dy: 88 }, // A ← alttan
  { dx: -100, dy: 0 }, // B ← soldan
  { dx: -100, dy: 0 }, // C ← soldan
  { dx: 0, dy: -84 }, // D ← üstten
  { dx: 0, dy: 84 }, // E ← alttan
  { dx: 0, dy: 88 }, // F ← alttan
] as const;

/**
 * İlan detay sinematik sahnesi — Apple ürün sayfası mantığı. Kapak arkada
 * sabit kalıp kaydırmaya tepki verirken (yaklaşır + kayar, parsel sınırı
 * çizilir), ilanın TÜM detayları bölüm bölüm belirip uzun süre tutunup geçer:
 * (A) başlık/fiyat/CTA, (B) parsel bilgileri, (C) bilgi devamı, (D) açıklama,
 * (E) öne çıkanlar, (F) konum. Böylece kaydırırken hareket hissi hiç kesilmez;
 * en sonda "tüm detaylar için kaydırın" çıkıp tam-etkileşimli klasik içeriğe
 * (galeri/harita/tam bilgi) bırakır. Kaydırma kilitlenmez (sticky + --p,
 * yalnızca transform/opacity). Mobil/reduced-motion: tek sabit poster (A).
 */
function DetailHero({ listing, phone, wa }: { listing: Listing; phone: string; wa: string }) {
  const { sectionRef, rootRef, mode, scenic } = useScrollScene<HTMLElement, HTMLDivElement>();
  const lite = mode === 'lite';
  const poster = listing.images?.[0];

  // Gerçek mod (scenic/lite) hesaplanana kadar (SSR + hydration öncesi) sahne
  // 'static' placeholder yüksekliğinde (82svh) durur; hydrate olur olmaz asıl
  // yükseklik (sceneVh / 185svh) devreye girip devasa bir CLS sıçraması
  // yaratıyordu. `mounted` yalnızca bu ilk pencerede false — reduced-motion
  // dahil HER nihai mod için hemen sonra true'ya döner, bu yüzden aşağıdaki
  // rezervasyon kalıcı bir uyumsuzluk bırakmaz.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- standart hydration bayrağı: SSR ile ilk client boyaması aynı kalmalı
  useEffect(() => setMounted(true), []);

  const eyebrow = (text: string) => (
    <p className="flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-brass-ondark">
      <span className="h-0.5 w-8 bg-brass-ondark" aria-hidden="true" />
      {text}
    </p>
  );
  // Metni saran survey-eskiz çerçevesi: içeriğe göre otomatik boyutlanır
  // (w-fit + rect %100). Sahnedeyken kendini çizer, mobilde statik tam-çizili.
  const framed = (node: ReactNode, maxW: string) => (
    <div className={cn('relative w-fit px-6 py-5 sm:px-7 sm:py-6', maxW)}>
      {/* Yumuşak yerel karartma — kutu ekranda nereye gelirse gelsin metin okunur */}
      <div
        className="pointer-events-none absolute -inset-8 bg-[radial-gradient(closest-side,hsl(155_36%_4%/0.5),transparent)]"
        aria-hidden="true"
      />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        aria-hidden="true"
      >
        <rect
          className={scenic ? 'dh-frame' : undefined}
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx="6"
          fill="none"
          stroke="hsl(36 74% 66%)"
          strokeWidth="1.5"
          pathLength={1}
          strokeDasharray={1}
        />
      </svg>
      <div className="relative">{node}</div>
    </div>
  );
  const factsPanel = (label: string, facts: { label: string; value: string }[]) =>
    framed(
      <>
        {eyebrow(label)}
        <dl className="mt-6 grid grid-cols-2 gap-x-10 gap-y-7">
          {facts.map((f) => (
            <div key={f.label}>
              <dt className="text-[12px] font-semibold uppercase tracking-[0.15em] text-white/55">
                {f.label}
              </dt>
              <dd className="nums mt-1.5 font-heading text-2xl font-bold text-white lg:text-[1.75rem]">
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </>,
      'max-w-xl',
    );

  const specs = listing.specs ?? [];
  const keyFacts = [{ label: 'Alan', value: listing.area }, ...specs.slice(0, 3)];
  const moreFacts = specs.slice(3, 7);
  const highlights = (listing.highlights ?? []).slice(0, 5);
  // Sağ-altta kaydırdıkça satır satır dolan bilgi özeti (biriken tapu kaydı).
  // Kısa, tek-satırlık değerler → kart temiz açılır.
  const summary = [
    { label: 'Alan', value: listing.area },
    ...specs.slice(0, 3),
    { label: 'Konum', value: listing.district },
  ];

  // Bölüm A — tür/başlık/fiyat/CTA (tek h1; mobilde de tek gösterilen).
  const titlePanel = framed(
    <>
      {eyebrow(`${listing.type} · ${listing.district}`)}
      <h1 className="mt-5 font-heading text-4xl font-bold leading-[1.04] tracking-[-0.02em] text-white sm:text-5xl lg:text-[3rem] xl:text-[3.5rem]">
        {listing.title}
      </h1>
      <p className="mt-4 flex flex-wrap items-center gap-2 text-[16px] text-white/85">
        <MapPin className="h-5 w-5 shrink-0 text-brass-ondark" />
        {listing.location}
        <span aria-hidden="true" className="text-white/30">
          ·
        </span>
        <span className="nums">{listing.area}</span>
      </p>
      <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-5">
        <div>
          <div className="nums font-heading text-4xl font-bold leading-none text-white sm:text-5xl">
            <span className="sr-only">Fiyat: </span>
            {listing.price}
          </div>
          <div className="nums mt-2 text-[14px] text-white/70">{listing.pricePerM2}</div>
        </div>
        <div className="flex flex-wrap gap-3">
          <MessageCta slug={listing.id} className="h-[52px] gap-2 px-7 text-base" />
          <Button
            asChild
            variant="outlineOnDark"
            size="lg"
            className="h-[52px] gap-2 px-7 text-base"
          >
            <a href={wa} target="_blank" rel="noreferrer">
              <MessageCircle className="size-5" />
              WhatsApp
            </a>
          </Button>
          <Button
            asChild
            variant="outlineOnDark"
            size="lg"
            className="h-[52px] gap-2 px-7 text-base"
          >
            <a href={telLink(phone)}>
              <Phone className="size-5" />
              Ara
            </a>
          </Button>
        </div>
      </div>
    </>,
    // 1024-1280'de sağ dock'la çakışmasın diye bir kademe dar; xl'de genişler.
    'max-w-xl xl:max-w-2xl',
  );

  // Bölümler — boş olanlar elenir; --p ekseninde otomatik dağıtılır.
  const chapters: { key: string; primary?: boolean; node: ReactNode }[] = [
    { key: 'A', primary: true, node: titlePanel },
    { key: 'B', node: factsPanel('Arazi bilgileri', keyFacts) },
  ];
  if (moreFacts.length > 0) {
    chapters.push({ key: 'C', node: factsPanel('Arazi bilgileri — devamı', moreFacts) });
  }
  if (listing.description) {
    chapters.push({
      key: 'D',
      node: framed(
        <>
          {eyebrow('İlan açıklaması')}
          <p className="mt-6 text-[18px] leading-relaxed text-white/90 lg:text-[20px] lg:leading-relaxed">
            {listing.description}
          </p>
        </>,
        'max-w-xl',
      ),
    });
  }
  if (highlights.length > 0) {
    chapters.push({
      key: 'E',
      node: framed(
        <>
          {eyebrow('Neden bu parsel')}
          <ul className="mt-6 grid gap-3.5">
            {highlights.map((h) => (
              <li key={h} className="flex items-start gap-3 text-[18px] leading-snug text-white/90">
                <CircleCheck className="mt-1 h-5 w-5 shrink-0 text-brass-ondark" />
                {h}
              </li>
            ))}
          </ul>
        </>,
        'max-w-xl',
      ),
    });
  }
  chapters.push({
    key: 'F',
    node: framed(
      <>
        {eyebrow('Konum')}
        <p className="mt-6 font-heading text-2xl font-bold text-white lg:text-3xl">
          {listing.location}
        </p>
        <p className="nums mt-3 text-[15px] text-white/70">
          {listing.lat.toFixed(4)}, {listing.lng.toFixed(4)}
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-white/60">
          Uydu görünümü, harita ve drone çekimi aşağıda.
        </p>
      </>,
      'max-w-xl',
    ),
  });

  const N = chapters.length;
  // Sahne yüksekliği bölüm sayısına göre ölçeklenir → her bölüm uzun tutunur
  // (bir bölüm ≈ bir ekran boyu kaydırma görünür kalır).
  const sceneVh = 100 + N * 118;
  // Bölümleri [0, 0.9] aralığına dağıt; pencereler neredeyse bitişik (uzun tutuş,
  // aralarda yalnızca kısa bir "arazi nefesi").
  const slot = 0.9 / N;

  return (
    <section
      ref={sectionRef}
      aria-label="İlan tanıtımı"
      className={cn(
        'bg-primary -mt-20 lg:-mt-24',
        (scenic || lite) && 'relative',
        // Hydration öncesi gerçek moda en yakın alanı CSS breakpoint'iyle
        // ayır (mobil: sabit 185svh, masaüstü: --scene-vh) → mod kesinleşince
        // sahne zıplamaz. mounted=true olunca kalıcı olarak devre dışı kalır.
        !mounted && 'min-h-[185svh] lg:min-h-[var(--scene-vh)]',
      )}
      // lite: kısaltılmış mobil sahne — ~1.1 ekran boyu kaydırma (--p 0→1)
      style={{
        ...(scenic ? { height: `${sceneVh}vh` } : lite ? { height: '185svh' } : undefined),
        ['--scene-vh' as string]: `${sceneVh}vh`,
      }}
    >
      <div
        ref={rootRef}
        className={cn(
          'overflow-hidden bg-primary',
          scenic && 'sticky top-0 h-screen',
          lite && 'sticky top-0 h-[100svh]',
          // static: KESİN yükseklik — min-h altında h-full zinciri 0'a çöküyor
          // ve başlık paneli ekran dışına kayıyordu (mobil "boş kapak" bug'ı).
          mode === 'static' && 'relative h-[82svh]',
          // Hydration öncesi bu iç kutu da 82svh'ta duruyordu; lite (en olası
          // sonuç) 100svh'a geçince alttan sabitli dh-m-stack birkaç piksel
          // kayıyordu (kalıntı CLS). mounted=true olunca kalıcı olarak silinir.
          !mounted && 'min-h-[100svh]',
        )}
      >
        {/* Kapak — arkada kalır, kaydırınca yaklaşır + hafif kayar (dh-cover) */}
        <div className={cn('absolute inset-0', (scenic || lite) && 'dh-cover')}>
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={poster}
              srcSet={imgSrcSet(poster)}
              sizes="100vw"
              alt={listing.title}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        {/* Okunurluk scrim'i */}
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(155_38%_5%_/_0.94)] via-[hsl(155_34%_7%_/_0.55)] via-[50%] to-[hsl(155_34%_8%_/_0.25)]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(155_36%_5%_/_0.72)] via-transparent via-[56%] to-transparent" />
        </div>
        <TopoLines className="inset-0 h-full w-full text-white/[0.05]" />

        {/* Sahne — kapak önünde, bölümler sırayla belirip uzun tutup geçer */}
        <div className="relative z-10 h-full">
          <div className="container relative h-full">
            {scenic ? (
              chapters.map((ch, i) => {
                const a = i === 0 ? -0.05 : i * slot + 0.004;
                const b = (i + 1) * slot - 0.004;
                const dir = DIRS[i % DIRS.length];
                return (
                  <div
                    key={ch.key}
                    className={cn(
                      'absolute dh-chapter',
                      POS[i % POS.length],
                      ch.key === 'A' && 'dh-chA',
                    )}
                    style={{
                      ['--a' as string]: a,
                      ['--b' as string]: b,
                      ['--span' as string]: b - a,
                      ['--dx' as string]: `${dir.dx}px`,
                      ['--dy' as string]: `${dir.dy}px`,
                    }}
                    aria-hidden={ch.primary ? undefined : true}
                  >
                    {ch.node}
                  </div>
                );
              })
            ) : lite ? (
              /* Mobil lite sahne — masthead dilinde başlık bloğu hemen görünür
                 (ilk ekran asla boş değil); kaydırdıkça yığın yukarı süzülür,
                 "Arazi özeti" kartı satır satır dolar. CTA'lar sahnede değil,
                 alttaki sabit ilan barında (başparmak erişimi). */
              <div className="dh-m-stack absolute inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))]">
                <div className="dh-m-title">
                  {eyebrow(`${listing.type} · ${listing.district}`)}
                  <h1 className="mt-3 font-heading text-[2rem] font-bold leading-[1.06] tracking-[-0.02em] text-white sm:text-4xl">
                    {listing.title}
                  </h1>
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-[15px] text-white/85">
                    <MapPin className="h-4 w-4 shrink-0 text-brass-ondark" />
                    {listing.location}
                    <span aria-hidden="true" className="text-white/30">
                      ·
                    </span>
                    <span className="nums">{listing.area}</span>
                  </p>
                  <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="nums font-heading text-3xl font-bold leading-none text-white">
                      <span className="sr-only">Fiyat: </span>
                      {listing.price}
                    </span>
                    <span className="nums text-[13px] text-white/70">{listing.pricePerM2}</span>
                  </div>
                  <span className="mt-4 block h-0.5 w-14 bg-brass" aria-hidden="true" />
                </div>

                {/* Biriken tapu kaydı — masaüstündeki double-bezel kartın mobil
                    karşılığı. Yükseklik baştan ayrılır; satırlar yalnızca
                    opacity/transform ile belirir (kaydırırken layout yok). */}
                <div className="dh-m-card mt-6" aria-hidden="true">
                  <div className="rounded-[1.5rem] bg-white/[0.06] p-1.5 shadow-[0_26px_60px_-26px_rgba(3,14,9,0.9)] ring-1 ring-white/10">
                    <div className="rounded-[1.15rem] bg-[hsl(154_30%_6%/0.94)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
                      <span className="inline-block rounded-full bg-brass/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brass-ondark">
                        Arazi özeti
                      </span>
                      <dl className="mt-3">
                        {summary.map((s, i) => {
                          const a = 0.18 + 0.6 * (i / Math.max(summary.length - 1, 1));
                          return (
                            <div
                              key={s.label}
                              className="dh-m-row flex items-baseline justify-between gap-4 border-t border-white/[0.14] py-[9px] first:border-t-0"
                              style={{ ['--a' as string]: a }}
                            >
                              <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/75">
                                {s.label}
                              </dt>
                              <dd className="nums text-right text-[13.5px] font-semibold text-white">
                                {s.value}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
                  </div>
                </div>

                {/* Sahne sonunda klasik içeriğe davet */}
                <div
                  className="dh-cue-end mt-5 flex flex-col items-center gap-1 text-white/70"
                  aria-hidden="true"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                    Tüm detaylar için kaydırın
                  </span>
                  <ChevronDown className="hint-float h-4 w-4" />
                </div>
              </div>
            ) : (
              <div className="absolute bottom-[12%] left-0">{titlePanel}</div>
            )}

            {/* İlk kart bir kez gösterilir, sonra sağ-üstte şeffaf çerçevede
                sabit kalır — kaydırma boyunca kompakt bilgi olarak görünür. */}
            {scenic ? (
              <div
                className="dh-dock absolute right-0 top-[14%] z-30 w-[19rem] max-w-[44vw] text-right xl:w-[21rem]"
                aria-hidden="true"
              >
                {/* Kalıcı başlık (masthead): kutu değil — büyük başlık öne çıkar,
                    altında brass kural, fiyat destek satırı. Okunurluk için
                    yumuşak yerel karartma; survey çerçevelerinden ayrı okunur. */}
                <div className="pointer-events-none absolute -inset-x-10 -inset-y-7 bg-[radial-gradient(62%_60%_at_74%_46%,hsl(155_38%_4%/0.66),transparent_74%)]" />
                <div className="relative">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brass-ondark">
                    {listing.type} · {listing.district}
                  </p>
                  <p className="mt-3 font-heading text-[27px] font-bold leading-[1.08] tracking-[-0.015em] text-white xl:text-[31px]">
                    {listing.title}
                  </p>
                  <span className="mt-4 ml-auto block h-0.5 w-14 bg-brass" aria-hidden="true" />
                  <p className="nums mt-3.5 text-[15px] font-semibold text-white/80">
                    {listing.price}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Sağ-alt: kaydırdıkça satır satır dolan bilgi özeti — biriken tapu
                kaydı. Double-bezel kart (dış kabuk + iç çekirdek, eş-merkez
                radius, iç highlight). Blur yok (kaydıran zemin üstünde perf). */}
            {scenic ? (
              <div
                className="dh-summary absolute right-0 top-[42%] z-30 w-[16rem] max-w-[38vw] xl:w-[18rem]"
                aria-hidden="true"
              >
                <div className="rounded-[1.5rem] bg-white/[0.06] p-1.5 shadow-[0_26px_60px_-26px_rgba(3,14,9,0.9)] ring-1 ring-white/10">
                  <div className="rounded-[1.15rem] bg-[hsl(154_30%_6%/0.94)] px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
                    <span className="inline-block rounded-full bg-brass/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-brass-ondark">
                      Arazi özeti
                    </span>
                    <dl className="mt-3">
                      {summary.map((s, i) => {
                        const a = 0.17 + 0.66 * (i / Math.max(summary.length - 1, 1));
                        return (
                          <div
                            key={s.label}
                            className="dh-sum flex items-baseline justify-between gap-4 border-t border-white/[0.14] py-[9px] first:border-t-0"
                            style={{ ['--a' as string]: a }}
                          >
                            <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/75">
                              {s.label}
                            </dt>
                            <dd className="nums text-right text-[13.5px] font-semibold text-white">
                              {s.value}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Kaydırma daveti (başta) + "tüm detaylar için" ipucu (sonda) */}
        {scenic ? (
          <>
            <div
              className="dh-cue pointer-events-none absolute inset-x-0 bottom-7 z-20 flex flex-col items-center gap-1.5 text-white/70"
              aria-hidden="true"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                Kaydırın
              </span>
              <ChevronDown className="hint-float h-5 w-5" />
            </div>
            <div
              className="dh-cue-end pointer-events-none absolute inset-x-0 bottom-7 z-20 flex flex-col items-center gap-1.5 text-white/70"
              aria-hidden="true"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                Tüm detaylar için kaydırın
              </span>
              <ChevronDown className="hint-float h-5 w-5" />
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

export function ListingDetail({ listing }: { listing: Listing }) {
  const { content } = useStore();
  const [idx, setIdx] = useState(0);
  // Paylaşım linki istemcide üretilir (canonical domain varsayımı yok)
  const [pageUrl, setPageUrl] = useState('');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- window.location yalnız client'ta var; hydration sonrası tek seferlik okuma
    setPageUrl(window.location.href);
  }, []);
  // Kapak görselinde ölçülü ken-burns/parallax (ana sayfadaki kartlarla aynı dil)
  const coverRef = useParallax<HTMLDivElement>(14);
  // Küçük resme tıklanınca kapak yumuşak geçer; ilk yüklemede (LCP) sabit.
  const [interacted, setInteracted] = useState(false);

  const images = listing.images ?? [];
  const cover = images[Math.min(idx, Math.max(images.length - 1, 0))];

  // Galeri gezinme: thumbnail'lara ek olarak kapak üstünde ok + parmak kaydırma
  // (telefonda kullanıcı büyük görseli kaydırmayı bekliyor — test geri bildirimi).
  const swipeX = useRef<number | null>(null);
  function goImage(dir: 1 | -1) {
    if (images.length < 2) return;
    setIdx((i) => (i + dir + images.length) % images.length);
    setInteracted(true);
  }
  const marker: MapMarker[] = [
    { lat: listing.lat, lng: listing.lng, title: listing.title, price: listing.price },
  ];
  const wa = waLink(
    content.contact.whatsapp,
    `Merhaba, "${listing.title}" (${listing.price}) ilanı hakkında bilgi almak istiyorum.`,
  );
  const share = `https://wa.me/?text=${encodeURIComponent(`${listing.title} · ${listing.price} — ${pageUrl}`)}`;

  const specs = [{ label: 'Alan', value: listing.area }, ...(listing.specs ?? [])];

  return (
    <>
      <DetailHero listing={listing} phone={content.contact.phone} wa={wa} />
      <DetailActionBar listing={listing} phone={content.contact.phone} wa={wa} />
      <div className="bg-background py-10 sm:py-14">
        <div className="container">
          {/* Kırıntı */}
          <Reveal immediate>
            <nav
              aria-label="Sayfa yolu"
              className="flex items-center gap-1.5 text-[14px] text-muted-foreground"
            >
              <Link href="/ilanlar" className="transition-colors hover:text-foreground">
                İlanlar
              </Link>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              <span className="truncate font-medium text-foreground">{listing.title}</span>
            </nav>
          </Reveal>

          <div className="mt-6 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
            {/* Sol: medya + açıklama — bölüm bölüm scroll ile canlanır */}
            <div className="min-w-0">
              {/* Kapak — ölçülmüş parsel çerçevesi + tıklamada yumuşak geçen görsel */}
              <Reveal immediate>
                <ParcelFrame>
                  <div
                    className="relative overflow-hidden rounded-lg border border-border bg-muted"
                    onTouchStart={(e) => {
                      swipeX.current = e.touches[0].clientX;
                    }}
                    onTouchEnd={(e) => {
                      if (swipeX.current === null) return;
                      const dx = e.changedTouches[0].clientX - swipeX.current;
                      swipeX.current = null;
                      if (Math.abs(dx) > 40) goImage(dx < 0 ? 1 : -1);
                    }}
                  >
                    <div ref={coverRef} className="parallax-cover relative aspect-[16/10]">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={idx}
                          src={cover}
                          srcSet={imgSrcSet(cover)}
                          sizes="(min-width: 1024px) 60vw, 100vw"
                          alt={listing.title}
                          draggable={false}
                          className={cn(
                            'absolute inset-0 h-full w-full select-none object-cover',
                            interacted && 'detail-cover-in',
                          )}
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-muted-foreground">
                          <MapPin className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    {listing.badge ? (
                      <span className="absolute left-5 top-5 z-10 rounded-sm bg-background/90 px-3 py-1.5 text-[12px] font-semibold text-foreground backdrop-blur-sm">
                        {listing.badge}
                      </span>
                    ) : null}

                    {/* Kapakta gezinme: ok + sayaç (telefonda parmak kaydırma da açık) */}
                    {images.length > 1 ? (
                      <>
                        <button
                          type="button"
                          onClick={() => goImage(-1)}
                          aria-label="Önceki fotoğraf"
                          className="absolute left-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-[hsl(155_30%_7%_/_0.4)] text-white backdrop-blur-sm transition-colors hover:bg-[hsl(155_30%_7%_/_0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => goImage(1)}
                          aria-label="Sonraki fotoğraf"
                          className="absolute right-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/40 bg-[hsl(155_30%_7%_/_0.4)] text-white backdrop-blur-sm transition-colors hover:bg-[hsl(155_30%_7%_/_0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        <span className="nums absolute bottom-3 right-3 z-10 rounded-full bg-[hsl(155_30%_7%_/_0.55)] px-2.5 py-1 text-[12px] font-semibold text-white backdrop-blur-sm">
                          {idx + 1} / {images.length}
                        </span>
                      </>
                    ) : null}
                  </div>
                </ParcelFrame>

                {images.length > 1 ? (
                  <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
                    {images.map((src, i) => (
                      <button
                        key={src + i}
                        type="button"
                        onClick={() => {
                          setIdx(i);
                          setInteracted(true);
                        }}
                        aria-label={`${i + 1}. fotoğrafı gösterin`}
                        aria-current={i === idx}
                        className={cn(
                          'relative aspect-[4/3] overflow-hidden rounded-sm border bg-muted transition-[transform,border-color] duration-200 ease-out-quart focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          i === idx
                            ? 'border-primary ring-1 ring-primary'
                            : 'border-border hover:-translate-y-0.5 hover:border-primary/40',
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumbUrl(src) ?? src}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}
              </Reveal>

              {listing.description ? (
                <Reveal className="mt-8">
                  <FieldLabel>İlan açıklaması</FieldLabel>
                  <p className="mt-3 leading-relaxed text-foreground/85">{listing.description}</p>
                </Reveal>
              ) : null}

              {listing.highlights?.length > 0 ? (
                <Reveal className="mt-8">
                  <FieldLabel>Öne çıkanlar</FieldLabel>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {listing.highlights.map((h, i) => (
                      <li
                        key={h}
                        className="draw-pop flex items-start gap-2 text-[15px] text-foreground/85"
                        style={{ transitionDelay: `${120 + i * 70}ms` }}
                      >
                        <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-brass-strong" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ) : null}

              {listing.droneVideo ? (
                <Reveal className="mt-8">
                  <FieldLabel>Drone ile havadan bakış</FieldLabel>
                  <div className="mt-3 overflow-hidden rounded-lg border border-border bg-primary">
                    <video
                      src={listing.droneVideo}
                      controls
                      playsInline
                      preload="metadata"
                      poster={listing.dronePoster || images[0]}
                      className="aspect-video h-auto w-full object-cover"
                    />
                  </div>
                </Reveal>
              ) : null}

              <Reveal className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <FieldLabel>Konum</FieldLabel>
                  <a
                    href={`https://www.google.com/maps?q=${listing.lat},${listing.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    Google Haritalar
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <LeafletMap
                    markers={marker}
                    center={[listing.lat, listing.lng]}
                    zoom={13}
                    fitBounds={false}
                    className="h-64 w-full sm:h-80 lg:h-96"
                  />
                </div>
              </Reveal>
            </div>

            {/* Sağ: bilgi kartı — tapu dosyası dili */}
            <Reveal immediate>
              <div className="lg:sticky lg:top-28">
                {/* Bilgi — tapu dosyası dili: parsel köşeleri + topo filigran */}
                <ParcelFrame>
                  <div className="relative overflow-hidden rounded-lg border border-border bg-card p-6 sm:p-7">
                    <TopoLines className="inset-0 h-full w-full text-primary/[0.03]" />
                    <div className="relative">
                      <p className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-brass-strong">
                        <span className="h-0.5 w-6 bg-brass" aria-hidden="true" />
                        {listing.type}
                      </p>
                      <h2 className="mt-3 font-heading text-2xl font-bold leading-tight tracking-[-0.01em] text-foreground">
                        {listing.title}
                      </h2>
                      <p className="mt-2 flex items-center gap-1.5 text-[15px] text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 text-brass-strong" />
                        {listing.location}
                      </p>

                      <div className="mt-6 border-y border-border py-4">
                        <div className="nums font-heading text-3xl font-bold leading-none text-foreground">
                          <span className="sr-only">Fiyat: </span>
                          {listing.price}
                        </div>
                        <div className="nums mt-1.5 text-sm text-muted-foreground">
                          {listing.pricePerM2}
                        </div>
                      </div>

                      {/* Dar ekranda etiket üstte, değer altta sola yaslı — uzun
                    değerler sağ hizada tırtıklı kırılmasın */}
                      <dl className="mt-2 divide-y divide-border">
                        {specs.map((s) => (
                          <div
                            key={s.label}
                            className="flex flex-col items-start gap-1 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                          >
                            <dt className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                              {s.label}
                            </dt>
                            <dd className="nums text-left text-[15px] font-semibold text-foreground sm:text-right">
                              {s.value}
                            </dd>
                          </div>
                        ))}
                      </dl>

                      <div className="mt-6 flex flex-col gap-3">
                        <MessageCta slug={listing.id} className="h-12 w-full gap-2 text-base" />
                        <Button
                          asChild
                          size="lg"
                          className="h-12 gap-2 bg-whatsapp text-base text-white hover:bg-whatsapp/90"
                        >
                          <a href={wa} target="_blank" rel="noreferrer">
                            <MessageCircle className="size-5" />
                            WhatsApp’tan Bilgi Al
                          </a>
                        </Button>
                        <Button
                          asChild
                          size="lg"
                          variant="outline"
                          className="h-12 gap-2 text-base"
                        >
                          <a href={telLink(content.contact.phone)}>
                            <Phone className="size-5" />
                            Ara: {content.contact.phone}
                          </a>
                        </Button>
                        <a
                          href={share}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 text-[14px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Share2 className="h-4 w-4" />
                          İlanı WhatsApp’tan paylaşın
                        </a>
                      </div>
                    </div>
                  </div>
                </ParcelFrame>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </>
  );
}
