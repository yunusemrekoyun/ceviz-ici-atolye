'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';
import { TopoLines } from '@/components/site/topo';
import { ShowcaseListing } from '@/components/listings/showcase-listing';
import { useScrollScene } from '@/lib/use-scroll-scene';
import { cn } from '@/lib/utils';
import { useStore, telLink, waLink } from '@/store';
import type { Listing } from '@/content';

const HERO_IMG =
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=2400&q=80';

/** Hero metin bloğu — rozet + başlık + altyazı + CTA'lar + istatistikler.
 * Scenic, lite ve statik dalların üçü de aynı kaynaktan beslenir. */
function HeroCopy({
  badge,
  titleLine1,
  titleAccent,
  subtitle,
  phone,
  stats,
}: {
  badge: string;
  titleLine1: string;
  titleAccent: string;
  subtitle: string;
  phone: string;
  stats: { value: string; label: string }[];
}) {
  return (
    <>
      <div className="max-w-2xl">
        <p className="flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-brass-ondark">
          <span className="h-0.5 w-8 bg-brass-ondark" aria-hidden="true" />
          {badge}
        </p>
        <h1 className="mt-6 font-heading text-4xl font-bold leading-[1.05] tracking-[-0.02em] text-white sm:text-5xl lg:text-[3.75rem]">
          {titleLine1} <span className="text-brass-ondark">{titleAccent}</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/90">{subtitle}</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="brass" size="lg" className="h-[52px] px-8 text-base">
            <Link href="/ilanlar">
              İlanları Görün
              <ArrowRight className="size-5" />
            </Link>
          </Button>
          <Button asChild variant="outlineOnDark" size="lg" className="h-[52px] px-8 text-base">
            <a href={telLink(phone)}>
              <Phone className="size-5" />
              {phone}
            </a>
          </Button>
        </div>
      </div>
      <div className="mt-10 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-5 border-t border-white/15 pt-7 sm:mt-14 sm:gap-y-6 sm:grid-cols-4 sm:pt-8">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="nums font-heading text-3xl font-bold leading-none text-white">
              {s.value}
            </div>
            <div className="mt-2 text-[13px] leading-snug text-white/75">{s.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * Açılış sekansı: hero → öne çıkan ilan tek kesintisiz morph. Kaydırdıkça
 * hero görseli fildişi matte ile çerçevelenip küçülür, ilan fotoğrafına
 * geçer, üstüne parsel çizilir ve bilgi belirir. Kart oluşunca yanlardaki
 * oklarla ilanlar arasında geçilir (görsel çapraz geçişle akar); aşağı
 * kaydırınca sayfa normal akışına döner. Kaydırma kilitlenmez (sticky + --p).
 * Mobil/reduced-motion: normal hero + sabit vitrin kartı.
 */
export function OpeningSequence({
  listings,
  totalCount,
}: {
  listings: Listing[];
  totalCount: number;
}) {
  const { sectionRef, rootRef, mode, scenic } = useScrollScene<HTMLElement, HTMLDivElement>();
  // Ana sayfa lite açılışı zaman+etkileşim tabanlı: --p yazılır ama lite DOM'u
  // --p tüketen sınıf kullanmaz (op-m-* marquee'leri salt zaman tabanlıdır).
  const lite = mode === 'lite';
  const { content } = useStore();
  const phone = content.contact.phone;
  // Dokunmatik kaydırma (swipe) — vitrin slider'ı için basit delta ölçümü.
  const touchX = useRef<number | null>(null);

  const first = listings[0];
  const firstCover = first?.images?.[0] ?? HERO_IMG;

  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  // İlk boyamada (SSR) ağır fallback yerine sade hero; showcase kartı yalnızca
  // mobil/statik kesinleşince eklenir → masaüstünde yük anı sıçraması olmaz.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- standart hydration bayrağı: SSR ile ilk client boyaması aynı kalmalı
  useEffect(() => setMounted(true), []);
  // Taban görsel sabit durur; ok'a basınca yeni görsel yandan kayıp üstüne
  // biner, kayma bitince taban güncellenir → çerçeve hep dolu, temiz kayma.
  const [baseSrc, setBaseSrc] = useState(firstCover);
  const [incoming, setIncoming] = useState<{ src: string; dir: 1 | -1; seq: number } | null>(null);
  const seq = useRef(0);

  const active = listings[idx] ?? first;

  // Açılışta duvardan rastgele bir ilan öne çıkar (kart görünmeden önce
  // seçildiği için ekranda takla olmaz). SSR'da idx=0, istemcide rastgele.
  useEffect(() => {
    if (listings.length > 1) {
      const r = Math.floor(Math.random() * listings.length);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- rastgele seçim kasıtlı olarak hydration SONRASI yapılır (SSR deterministik kalır)
      setIdx(r);

      setBaseSrc(listings[r]?.images?.[0] ?? firstCover);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // İlan duvarı: tüm ilan görsellerinden küçük karolar, 3 sıraya dağıtılır.
  const wallPool = listings.flatMap((l) => l.images ?? []).map((u) => u.replace(/w=\d+/, 'w=520'));
  // Mobil duvar ekran dışındayken marquee animasyonu durdurulur (pil/jank)
  const liteHeroRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = liteHeroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        el.dataset.wall = entry.isIntersecting ? 'on' : 'off';
      },
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mode]);

  const wallRows = [0, 1, 2].map((r) => {
    const a = wallPool.filter((_, i) => i % 3 === r);
    const b = a.length >= 4 ? a : wallPool;
    return b.length ? b : [firstCover];
  });

  /** İpucuna tıklanınca sahnenin sonuna yumuşakça in — morph'u atla. */
  function skipScene() {
    const section = sectionRef.current;
    if (!section) return;
    const top =
      section.getBoundingClientRect().top +
      window.scrollY +
      section.offsetHeight -
      window.innerHeight +
      2;
    window.scrollTo({ top, behavior: 'smooth' });
  }

  function go(d: 1 | -1) {
    if (listings.length < 2) return;
    const next = (idx + d + listings.length) % listings.length;
    const cover = listings[next]?.images?.[0] ?? HERO_IMG;
    seq.current += 1;
    setDir(d);
    setIdx(next);
    setIncoming({ src: cover, dir: d, seq: seq.current });
  }

  function onIncomingEnd(src: string) {
    setBaseSrc(src);
    setIncoming(null);
  }

  const wa = active
    ? waLink(
        content.contact.whatsapp,
        `Merhaba, "${active.title}" (${active.price}) ilanı hakkında bilgi almak istiyorum.`,
      )
    : '#';

  const stats = [
    { value: String(totalCount), label: 'Yayında arazi ilanı' },
    ...content.stats.filter((s) => !/ilan/i.test(s.label)).slice(0, 3),
  ];

  return (
    <section
      ref={sectionRef}
      aria-label="Tanıtım"
      className={cn(
        scenic ? 'relative -mt-20 h-[170vh] bg-primary lg:-mt-24' : '-mt-20 lg:-mt-24',
        // SSR/ilk boyamada sahne henüz bilinmezken masaüstünde 220vh yüksekliği
        // baştan ayır → hydrate olurken alttaki içerik yerinden oynamaz (CLS yok).
        // 170vh: test geri bildirimi — daha uzun pin 'sayfa kaydırılamıyor' hissi verdi.
        // min-h-[100svh]: mobilde de aynı mantık — lite modun hero yüksekliğiyle
        // eşleşir, hydrate olunca (lite'a geçince) hero boyu zıplamaz.
        !mounted && 'bg-primary min-h-[100svh] lg:h-[170vh]',
      )}
    >
      <div
        ref={rootRef}
        className={scenic ? 'sticky top-0 h-screen overflow-hidden bg-background' : ''}
      >
        {scenic && active ? (
          <div className="relative h-full w-full">
            {/* İlan duvarı — hero arka planı: 3 sıra yatay marquee (gerçek ilanlar) */}
            <div className="op-wall absolute inset-0 overflow-hidden">
              <div className="flex h-full flex-col justify-center gap-3 lg:gap-4">
                {wallRows.map((tiles, r) => {
                  // Derinlik: orta sıra büyük/net, dış sıralar küçük/soluk.
                  const size = r === 1 ? 'h-44 w-64 lg:h-52 lg:w-80' : 'h-32 w-48 lg:h-40 lg:w-64';
                  return (
                    <div
                      key={r}
                      className={cn(
                        'op-row',
                        r === 1 ? 'op-row-r opacity-100' : 'op-row-l opacity-[0.55]',
                      )}
                      style={{ ['--dur' as string]: `${[78, 104, 66][r]}s` }}
                    >
                      {[...tiles, ...tiles].map((src, i) => (
                        <div
                          key={i}
                          className={cn(
                            'relative mr-3 shrink-0 overflow-hidden rounded-md after:absolute after:inset-0 after:bg-primary/25 lg:mr-4',
                            size,
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover brightness-90 saturate-[.85]"
                          />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fildişi veil — görsel çerçevelenirken duvarı kapatır (kart zemini) */}
            <div className="op-veil absolute inset-0 bg-background" aria-hidden="true" />

            {/* Kart gölgesi — pencereyle aynı ölçekte ayrı katman (statik gölge,
                yalnızca opacity animasyonu; overflow-hidden'a takılmaz) */}
            <div className="op-frame absolute inset-0 z-[5]" aria-hidden="true" />

            {/* Seçili karo — duvardan yaklaşıp büyür, çerçevelenir; ok'la değişir */}
            <div className="op-window absolute inset-0 z-[6] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={baseSrc}
                alt={active.title}
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
              {incoming ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={incoming.seq}
                  src={incoming.src}
                  alt=""
                  aria-hidden="true"
                  onAnimationEnd={() => onIncomingEnd(incoming.src)}
                  className={cn(
                    'absolute inset-0 h-full w-full object-cover',
                    incoming.dir === 1 ? 'op-slide-r' : 'op-slide-l',
                  )}
                />
              ) : null}

              {/* Kadastro parseli — çerçevelenmiş görsele çizilir */}
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox="0 0 1440 900"
                preserveAspectRatio="xMidYMid slice"
                fill="none"
                aria-hidden="true"
              >
                <polygon
                  className="scene-parcel"
                  points="470,436 980,404 1046,712 536,760"
                  pathLength={1}
                  stroke="hsl(36 74% 66%)"
                  strokeWidth={3}
                  strokeDasharray={1}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {[
                  [470, 436],
                  [980, 404],
                  [1046, 712],
                  [536, 760],
                ].map(([x, y]) => (
                  <g key={`${x}-${y}`} className="scene-corner">
                    <line
                      x1={x - 13}
                      y1={y}
                      x2={x + 13}
                      y2={y}
                      stroke="hsl(36 74% 66%)"
                      strokeWidth={3}
                    />
                    <line
                      x1={x}
                      y1={y - 13}
                      x2={x}
                      y2={y + 13}
                      stroke="hsl(36 74% 66%)"
                      strokeWidth={3}
                    />
                  </g>
                ))}
              </svg>
            </div>

            {/* Metin scrim'i — duvar ve büyüyen görsel üstünde okunurluk */}
            <div className="op-scrim absolute inset-0 z-[5]" aria-hidden="true">
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(155_36%_5%_/_0.92)] via-[hsl(155_32%_7%_/_0.5)] via-[44%] to-[hsl(155_32%_8%_/_0.15)] to-[80%]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(155_36%_5%_/_0.72)] via-transparent via-[48%] to-transparent" />
              <TopoLines className="inset-0 h-full w-full text-white/[0.05]" />
            </div>

            {/* Hero metni — çerçeveleme başlayınca çıkar */}
            <div className="op-hero absolute inset-0 z-10 flex items-center">
              <div className="container">
                <HeroCopy
                  badge={content.hero.badge}
                  titleLine1={content.hero.titleLine1}
                  titleAccent={content.hero.titleAccent}
                  subtitle={content.hero.subtitle}
                  phone={phone}
                  stats={stats}
                />
              </div>
            </div>

            {/* Slider okları — ekranın sağ/sol kenarında, kart oluşunca belirir */}
            {listings.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Önceki ilan"
                  className="op-arrows absolute left-4 top-[42%] z-30 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-primary text-white shadow-soft-lg transition hover:bg-[hsl(154_46%_11%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:left-8"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Sonraki ilan"
                  className="op-arrows absolute right-4 top-[42%] z-30 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-primary text-white shadow-soft-lg transition hover:bg-[hsl(154_46%_11%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:right-8"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : null}

            {/* Bilgi kartı — kap sabit, içerik ilan değişince yumuşak geçer */}
            <div className="op-caption absolute inset-x-0 top-[68.5%] z-20 flex justify-center">
              <div
                className="w-[50%] max-w-[52rem] overflow-hidden rounded-lg border border-border bg-card/95 p-5 shadow-soft-lg backdrop-blur-sm sm:p-6"
                aria-live="polite"
                aria-atomic="true"
              >
                {/* key ile iç sarmalayıcı yeniden binerek fade tetiklenir; canlı
                    bölge (aria-live) üstteki sabit kapta kalır → okuyucu duyurur */}
                <div
                  key={idx}
                  className="op-fade"
                  style={{ ['--sdir' as string]: `${dir * 22}px` }}
                >
                  <p className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-brass-strong">
                    <span className="h-0.5 w-6 bg-brass" aria-hidden="true" />
                    Öne çıkan parsel
                    <span className="nums ml-auto normal-case tracking-normal text-muted-foreground">
                      {idx + 1} / {listings.length}
                    </span>
                  </p>
                  <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-heading text-xl font-bold leading-tight tracking-[-0.01em] text-foreground sm:text-2xl">
                        {active.title}
                      </h2>
                      <p className="mt-1.5 flex items-center gap-1.5 text-[14px] text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 text-brass-strong" />
                        {active.location}
                        <span aria-hidden="true" className="text-border">
                          ·
                        </span>
                        <span className="nums">{active.area}</span>
                      </p>
                    </div>
                    <div className="nums font-heading text-2xl font-bold leading-none text-foreground sm:text-[1.75rem]">
                      {active.price}
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <Button asChild size="lg" className="h-12 flex-1">
                      <Link href={`/ilan/${active.id}`}>
                        Detayları Gör
                        <ArrowRight className="size-5" />
                      </Link>
                    </Button>
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="WhatsApp’tan yazın"
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-sm border border-border text-whatsapp transition-colors hover:border-whatsapp/40 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Kaydırma ipucu — tıklanınca sahneyi atlar (test geri bildirimi:
                kullanıcı zoom evresinde 'kaydıramıyorum' sanabiliyor) */}
            <button
              type="button"
              onClick={skipScene}
              aria-label="Tanıtımı geçin"
              className="op-cue absolute inset-x-0 bottom-7 z-20 mx-auto flex w-fit cursor-pointer flex-col items-center gap-1.5 text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                Kaydırın
              </span>
              <ChevronDown className="hint-float h-5 w-5" />
            </button>
          </div>
        ) : lite && active ? (
          <>
            {/* Lite hero — masaüstü açılışının mobil karşılığı: ilan duvarı
                marquee'si arka planda akar (salt zaman tabanlı), önünde hero
                metni. Scroll bağı yok; morph yerine akan duvar + slider. */}
            <div
              ref={liteHeroRef}
              className="relative flex min-h-[100svh] items-center overflow-hidden bg-primary"
            >
              <div className="absolute inset-0" aria-hidden="true">
                <div className="flex h-full flex-col justify-center gap-3">
                  {wallRows.map((allTiles, r) => {
                    // Zayıf cihazlarda kasmayı azalt: mobil duvarda sıra başına
                    // daha az karo yeter (görsel yoğunluk scrim altında zaten kısıtlı)
                    const tiles = allTiles.slice(0, 5);
                    const size = r === 1 ? 'h-36 w-52' : 'h-28 w-40';
                    return (
                      <div
                        key={r}
                        className={cn('op-row', r === 1 ? 'op-m-row-r' : 'op-m-row-l')}
                        style={{ ['--dur' as string]: `${[84, 110, 72][r]}s` }}
                      >
                        {[...tiles, ...tiles].map((src, i) => (
                          <div
                            key={i}
                            className={cn(
                              'relative mr-3 shrink-0 overflow-hidden rounded-md after:absolute after:inset-0 after:bg-primary/25',
                              size,
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={src}
                              alt=""
                              aria-hidden="true"
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover brightness-[.55] saturate-[.6]"
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                {/* Okunurluk scrim'i — duvar dekoratif katman, metin her satırda
                    sabit kontrasta oturur (masaüstü scenic'teki sol-ağırlıklı dil) */}
                <div className="absolute inset-0 bg-[hsl(154_40%_9%_/_0.72)]" />
                <div className="absolute inset-0 bg-gradient-to-r from-[hsl(155_36%_5%_/_0.9)] via-[hsl(155_32%_7%_/_0.45)] via-[55%] to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(155_36%_5%_/_0.92)] via-[hsl(155_32%_7%_/_0.5)] via-[55%] to-[hsl(155_34%_8%_/_0.3)]" />
                <TopoLines className="inset-0 h-full w-full text-white/[0.05]" />
              </div>
              {/* Alt boşluk: sabit aksiyon barı istatistikleri örtmesin */}
              <div className="container relative pb-[calc(var(--action-bar-h)+1.25rem)] pt-28">
                <HeroCopy
                  badge={content.hero.badge}
                  titleLine1={content.hero.titleLine1}
                  titleAccent={content.hero.titleAccent}
                  subtitle={content.hero.subtitle}
                  phone={phone}
                  stats={stats}
                />
              </div>
            </div>

            {/* Vitrin slider'ı — masaüstündeki ok/geçiş mekaniğinin mobil
                karşılığı: oklar + swipe + sayaç, kart geçişte yandan süzülür. */}
            <div className="bg-background py-10 sm:py-16">
              <div className="container">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <p className="flex min-w-0 items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-brass-strong">
                    <span className="h-0.5 w-6 shrink-0 bg-brass" aria-hidden="true" />
                    Öne çıkan parsel
                    <span className="nums normal-case tracking-normal text-muted-foreground">
                      {idx + 1} / {listings.length}
                    </span>
                  </p>
                  {listings.length > 1 ? (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => go(-1)}
                        aria-label="Önceki ilan"
                        className="grid h-11 w-11 place-items-center rounded-full bg-primary text-white shadow-soft transition hover:bg-[hsl(154_46%_11%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => go(1)}
                        aria-label="Sonraki ilan"
                        className="grid h-11 w-11 place-items-center rounded-full bg-primary text-white shadow-soft transition hover:bg-[hsl(154_46%_11%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  ) : null}
                </div>
                <div
                  onTouchStart={(e) => {
                    touchX.current = e.touches[0]?.clientX ?? null;
                  }}
                  onTouchEnd={(e) => {
                    const startX = touchX.current;
                    touchX.current = null;
                    if (startX == null) return;
                    const dx = (e.changedTouches[0]?.clientX ?? startX) - startX;
                    if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
                  }}
                >
                  <div
                    key={idx}
                    className="op-fade"
                    style={{ ['--sdir' as string]: `${dir * 22}px` }}
                  >
                    <ShowcaseListing listing={active} />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Fallback (reduced-motion / SSR ilk boyama): normal hero + sabit vitrin */}
            <div className="relative flex min-h-[42rem] items-center overflow-hidden bg-primary lg:min-h-[48rem]">
              <div className="absolute inset-0 -z-10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={HERO_IMG}
                  alt="Kütahya kırsalında gün batımında tarlalar"
                  className="kenburns h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-[hsl(154_40%_10%_/_0.12)]" aria-hidden="true" />
                <div
                  className="absolute inset-0 bg-gradient-to-r from-[hsl(155_34%_5%_/_0.92)] via-[hsl(155_30%_7%_/_0.42)] via-[42%] to-transparent to-[72%]"
                  aria-hidden="true"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[hsl(155_34%_5%_/_0.78)] via-transparent via-[46%] to-transparent"
                  aria-hidden="true"
                />
                <TopoLines className="inset-0 h-full w-full text-white/[0.06]" />
              </div>
              <div className="container pb-20 pt-32 lg:pb-24 lg:pt-40">
                <HeroCopy
                  badge={content.hero.badge}
                  titleLine1={content.hero.titleLine1}
                  titleAccent={content.hero.titleAccent}
                  subtitle={content.hero.subtitle}
                  phone={phone}
                  stats={stats}
                />
              </div>
            </div>
            {mounted && first ? (
              <div className="bg-background py-16 sm:py-20">
                <div className="container">
                  <Reveal>
                    <ShowcaseListing listing={first} />
                  </Reveal>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
