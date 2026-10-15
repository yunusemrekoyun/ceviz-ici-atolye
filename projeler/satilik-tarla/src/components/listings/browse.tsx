'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Map as MapIcon, SlidersHorizontal, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ListingCard } from '@/components/listings/listing-card';
import { Reveal } from '@/components/motion/reveal';
import { ParcelFrame, TopoLines } from '@/components/site/topo';
import { cn } from '@/lib/utils';
import { LAND_TYPES } from '@/content';
import { IMAR_LABELS, TAPU_LABELS, TYPE_MAP, YOL_LABELS } from '@/lib/mappers';
import type { SearchResult } from '@/lib/listing-search';
import { useStore, waLink } from '@/store';
import { SaveSearchButton } from './save-search-button';

const SORTS = [
  { value: 'one-cikan', label: 'Öne çıkanlar' },
  { value: 'fiyat-artan', label: 'Fiyat (önce en düşük)' },
  { value: 'fiyat-azalan', label: 'Fiyat (önce en yüksek)' },
  { value: 'alan-buyuk', label: 'Alan (önce en büyük)' },
] as const;

/** Sol ray / mobil filtre içeriği: ilçe ve tür listeleri, sayaçlı. */
function FilterRail({
  districts,
  ilce,
  tur,
  countBy,
  onPick,
}: {
  districts: string[];
  ilce: string;
  tur: string;
  countBy: (key: 'district' | 'type', value: string) => number;
  onPick: (key: 'ilce' | 'tur', value: string | null) => void;
}) {
  const group = (
    title: string,
    items: { label: string; value: string | null; count?: number }[],
    activeValue: string,
  ) => (
    <div>
      <h3 className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-brass-strong">
        <span className="h-0.5 w-5 bg-brass" aria-hidden="true" />
        {title}
      </h3>
      {/* Pafta indeksi: hairline ayraçlar, aktif satırda brass ölçüm çubuğu */}
      <ul className="mt-3 border-t border-border">
        {items.map((it) => {
          const active = (it.value ?? '') === activeValue;
          // Sıfır sonuçlu kategori: seçilebilir görünüp boş listeye götürmesin
          const empty = it.count === 0 && !active;
          return (
            <li key={it.label} className="border-b border-border">
              <button
                type="button"
                onClick={() => onPick(title === 'İlçe' ? 'ilce' : 'tur', it.value)}
                disabled={empty}
                className={cn(
                  // Dokunma hedefi ≥44px; masaüstünde sıkı satır korunur
                  'relative flex w-full items-center justify-between gap-3 py-3 pl-4 pr-1 text-left text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:py-2.5',
                  active
                    ? 'font-semibold text-foreground'
                    : empty
                      ? 'text-foreground/35'
                      : 'text-foreground/70 hover:text-foreground',
                )}
                aria-pressed={active}
              >
                <span
                  className={cn(
                    'absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 bg-brass transition-opacity duration-200',
                    active ? 'opacity-100' : 'opacity-0',
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{it.label}</span>
                {typeof it.count === 'number' ? (
                  <span
                    className={cn(
                      'nums shrink-0 text-[13px] tabular-nums',
                      active
                        ? 'text-brass-strong'
                        : empty
                          ? 'text-muted-foreground/40'
                          : 'text-muted-foreground',
                    )}
                  >
                    {String(it.count).padStart(2, '0')}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className="space-y-8">
      {group(
        'İlçe',
        [
          { label: 'Tüm ilçeler', value: null },
          ...districts.map((d) => ({ label: d, value: d, count: countBy('district', d) })),
        ],
        ilce,
      )}
      {group(
        'Arazi Türü',
        [
          { label: 'Tüm türler', value: null },
          ...LAND_TYPES.map((t) => ({ label: t, value: t, count: countBy('type', t) })),
        ],
        tur,
      )}
    </div>
  );
}

const FILTER_KEYS = [
  'ilce',
  'tur',
  'q',
  'imar',
  'tapu',
  'yol',
  'su',
  'elektrik',
  'minFiyat',
  'maxFiyat',
  'minAlan',
  'maxAlan',
] as const;

/** Ray altı gelişmiş filtreler: imar/tapu/yol seçmelileri, su/elektrik ve
 * fiyat-alan aralıkları — hepsi URL-senkron, sunucu yeniden sorgular. */
function AdvancedFilters({
  get,
  setParam,
}: {
  get: (k: string) => string;
  setParam: (k: string, v: string | null) => void;
}) {
  const selectRow = (label: string, key: string, options: Record<string, string>) => (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.16em] text-brass-strong">
        {label}
      </span>
      <select
        value={get(key)}
        onChange={(e) => setParam(key, e.target.value || null)}
        className="h-10 w-full rounded-sm border border-input bg-card px-2.5 text-[14px] text-foreground outline-none focus:border-primary"
      >
        <option value="">Tümü</option>
        {Object.entries(options).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );

  const rangeRow = (label: string, minK: string, maxK: string) => (
    <div>
      <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.16em] text-brass-strong">
        {label}
      </span>
      <div className="flex items-center gap-2">
        {[minK, maxK].map((k, i) => (
          <input
            key={`${k}:${get(k)}`}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={i === 0 ? 'En az' : 'En çok'}
            defaultValue={get(k)}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== get(k)) setParam(k, v || null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            className="nums h-10 w-full rounded-sm border border-input bg-card px-2.5 text-[14px] text-foreground outline-none focus:border-primary"
          />
        ))}
      </div>
    </div>
  );

  const toggleRow = (label: string, key: string) => (
    <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-[15px] text-foreground/80">
      <input
        type="checkbox"
        checked={get(key) === '1'}
        onChange={(e) => setParam(key, e.target.checked ? '1' : null)}
        className="h-4 w-4 accent-[hsl(154_42%_15%)]"
      />
      {label}
    </label>
  );

  return (
    <div className="space-y-5">
      <h3 className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-brass-strong">
        <span className="h-0.5 w-5 bg-brass" aria-hidden="true" />
        Arazi Bilgileri
      </h3>
      {selectRow('İmar Durumu', 'imar', IMAR_LABELS)}
      {selectRow('Tapu Durumu', 'tapu', TAPU_LABELS)}
      {selectRow('Yol Durumu', 'yol', YOL_LABELS)}
      <div className="space-y-1">
        {toggleRow('Su var', 'su')}
        {toggleRow('Elektrik var', 'elektrik')}
      </div>
      {rangeRow('Fiyat (₺)', 'minFiyat', 'maxFiyat')}
      {rangeRow('Alan (m²)', 'minAlan', 'maxAlan')}
    </div>
  );
}

export function Browse({ result }: { result: SearchResult }) {
  const { listings, total, page, pageCount, facets } = result;
  const { content } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const ilce = searchParams.get('ilce') ?? '';
  const tur = searchParams.get('tur') ?? '';
  const q = searchParams.get('q') ?? '';
  const sirala = searchParams.get('sirala') ?? 'one-cikan';
  const get = (k: string) => searchParams.get(k) ?? '';

  function setParam(key: string, value: string | null, scroll = false) {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    if (key !== 'sayfa') p.delete('sayfa'); // filtre değişince ilk sayfa
    router.replace(`${pathname}${p.size ? `?${p.toString()}` : ''}`, { scroll });
  }

  function clearFilters() {
    const p = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((k) => p.delete(k));
    p.delete('sayfa');
    router.replace(`${pathname}${p.size ? `?${p.toString()}` : ''}`, { scroll: false });
  }

  const districts = content.districts.map((d) => d.name);
  // Sayaçlar sunucu facet'lerinden (kendi boyutunun filtresi hariç hesaplanır)
  const countBy = (key: 'district' | 'type', value: string) =>
    key === 'district'
      ? (facets.district[value] ?? 0)
      : (facets.type[TYPE_MAP[value as keyof typeof TYPE_MAP]] ?? 0);

  const visible = listings; // filtre + sıralama + sayfalama sunucuda

  const rangeChip = (minK: string, maxK: string, unit: string) => {
    const min = get(minK);
    const max = get(maxK);
    if (!min && !max) return null;
    const label =
      min && max ? `${min}–${max} ${unit}` : min ? `≥ ${min} ${unit}` : `≤ ${max} ${unit}`;
    return { key: `${minK},${maxK}`, label };
  };
  const chips = [
    ilce ? { key: 'ilce', label: ilce } : null,
    tur ? { key: 'tur', label: tur } : null,
    q ? { key: 'q', label: `“${q}”` } : null,
    get('imar') ? { key: 'imar', label: IMAR_LABELS[get('imar')] ?? get('imar') } : null,
    get('tapu') ? { key: 'tapu', label: `${TAPU_LABELS[get('tapu')] ?? get('tapu')} tapu` } : null,
    get('yol') ? { key: 'yol', label: YOL_LABELS[get('yol')] ?? get('yol') } : null,
    get('su') ? { key: 'su', label: 'Su var' } : null,
    get('elektrik') ? { key: 'elektrik', label: 'Elektrik var' } : null,
    rangeChip('minFiyat', 'maxFiyat', '₺'),
    rangeChip('minAlan', 'maxAlan', 'm²'),
  ].filter(Boolean) as { key: string; label: string }[];

  function removeChip(key: string) {
    const p = new URLSearchParams(searchParams.toString());
    key.split(',').forEach((k) => p.delete(k));
    p.delete('sayfa');
    router.replace(`${pathname}${p.size ? `?${p.toString()}` : ''}`, { scroll: false });
  }

  const title = tur ? `${tur} İlanları` : ilce ? `${ilce} İlanları` : 'Tüm İlanlar';

  return (
    <div className="bg-background py-10 sm:py-14">
      <div className="container">
        {/* Sayfa başlığı — pafta kartuşu: topo filigran + parsel köşe işaretleri */}
        <Reveal immediate>
          <ParcelFrame>
            <div className="relative overflow-hidden rounded-lg border border-border bg-card px-6 py-8 sm:px-9 sm:py-10">
              <TopoLines className="inset-0 h-full w-full text-primary/[0.035]" />
              <div className="relative">
                <p className="flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-brass-strong">
                  <span className="draw-dash h-0.5 w-8 bg-brass" aria-hidden="true" />
                  İlan dizini
                </p>
                <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                  Kütahya merkez ve ilçelerindeki arazi kayıtları. İlçe ve türe göre süzün; her ilan
                  gerçek fotoğraf ve net arazi bilgisiyle.
                </p>
              </div>
            </div>
          </ParcelFrame>
        </Reveal>

        {/* Tablette (md) de kalıcı filtre rayı — Sheet yalnızca telefonda */}
        <div className="mt-10 grid gap-8 md:grid-cols-[13rem_1fr] lg:grid-cols-[15rem_1fr] lg:gap-10 xl:grid-cols-[16rem_1fr]">
          <aside className="hidden md:block" aria-label="İlan filtreleri">
            <div className="sticky top-28">
              <FilterRail
                districts={districts}
                ilce={ilce}
                tur={tur}
                countBy={countBy}
                onPick={(key, value) => setParam(key, value)}
              />
              <div className="mt-8 border-t border-border pt-6">
                <AdvancedFilters get={get} setParam={setParam} />
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            {/* Araç çubuğu: sayaç + çipler + sıralama */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[15px] text-muted-foreground">
                  <b className="font-semibold text-foreground">{total}</b> ilan
                </span>
                {chips.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => removeChip(c.key)}
                    className="flex min-h-9 items-center gap-1.5 rounded-sm bg-secondary px-3 py-1.5 text-[13px] font-semibold text-secondary-foreground transition-colors hover:bg-[hsl(150_16%_85%)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`${c.label} filtresini kaldırın`}
                  >
                    {c.label}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5">
                {/* Mobil: filtre paneli */}
                <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="relative h-11 md:hidden">
                      <SlidersHorizontal className="h-4 w-4" />
                      Filtrele
                      {chips.length > 0 ? (
                        <span className="nums absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brass px-1 text-[11px] font-bold text-brass-foreground">
                          {chips.length}
                        </span>
                      ) : null}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="flex w-[86%] max-w-sm flex-col p-0">
                    <div className="flex-1 overflow-y-auto p-6">
                      <SheetTitle className="font-heading text-lg font-semibold">
                        Filtreler
                      </SheetTitle>
                      <div className="mt-6">
                        <FilterRail
                          districts={districts}
                          ilce={ilce}
                          tur={tur}
                          countBy={countBy}
                          onPick={(key, value) => setParam(key, value)}
                        />
                        <div className="mt-8 border-t border-border pt-6">
                          <AdvancedFilters get={get} setParam={setParam} />
                        </div>
                      </div>
                    </div>
                    {/* Onay her an elin altında: alta sabit, listeyle kaymaz */}
                    <div className="border-t border-border bg-background p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                      <SheetClose asChild>
                        <Button className="h-12 w-full">{total} ilanı göster</Button>
                      </SheetClose>
                      {chips.length > 0 ? (
                        <button
                          type="button"
                          onClick={clearFilters}
                          className="mt-1 inline-flex min-h-11 w-full items-center justify-center text-[14px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Filtreleri temizle
                        </button>
                      ) : null}
                    </div>
                  </SheetContent>
                </Sheet>

                <Button asChild variant="outline" size="sm" className="h-11 lg:h-9">
                  <Link href="/harita">
                    <MapIcon className="h-4 w-4" />
                    Haritada Gör
                  </Link>
                </Button>
                <SaveSearchButton chipLabels={chips.map((c) => c.label)} />
                <Select
                  value={sirala}
                  onValueChange={(v) => setParam('sirala', v === 'one-cikan' ? null : v)}
                >
                  <SelectTrigger
                    className="h-11 w-auto gap-2 rounded-sm border-input bg-card text-[14px] font-medium lg:h-9"
                    aria-label="Sıralama"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {SORTS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sonuçlar */}
            {visible.length === 0 ? (
              <div className="mt-8 rounded-lg border border-dashed border-input bg-muted/50 py-16 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-border bg-background text-brass-strong">
                  <Search className="h-7 w-7" />
                </div>
                <h2 className="mt-5 font-heading text-xl font-semibold text-foreground">
                  Bu kriterlere uygun ilan bulunamadı
                </h2>
                <p className="mx-auto mt-2 max-w-sm leading-relaxed text-muted-foreground">
                  Filtreleri değiştirin ya da bize ulaşın; size uygun araziyi birlikte bulalım.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => router.replace(pathname, { scroll: false })}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Filtreleri temizle
                  </Button>
                  <Button asChild>
                    <a
                      href={waLink(
                        content.contact.whatsapp,
                        'Merhaba, aradığım kriterlerde ilan bulamadım. Bana uygun bir arazi var mı?',
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Bize Ulaşın
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              // Filtre/sıralama değişince grid remount olur → kartlar yeniden
              // kademeli belirir (etkileşimli yanıt, sert takla değil).
              <div
                key={searchParams.toString()}
                className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
              >
                {visible.map((l, i) => (
                  <Reveal key={l.id} delay={(i % 3) * 70} className="h-full">
                    <ListingCard listing={l} className="h-full" />
                  </Reveal>
                ))}
              </div>
            )}

            {pageCount > 1 ? (
              <nav
                aria-label="Sayfalama"
                className="mt-10 flex items-center justify-center gap-3 border-t border-border pt-6"
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setParam('sayfa', page - 1 > 1 ? String(page - 1) : null, true)}
                >
                  Önceki
                </Button>
                <span className="nums text-[14px] text-muted-foreground">
                  Sayfa <b className="font-semibold text-foreground">{page}</b> / {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount}
                  onClick={() => setParam('sayfa', String(page + 1), true)}
                >
                  Sonraki
                </Button>
              </nav>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
