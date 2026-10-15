import { ArrowRight } from 'lucide-react';

// Editorial room card (design-refs/refs.pdf as base, elevated): full-bleed image,
// serif name + serif peach price on a baseline, hairline rule, meta + arrow link.
// Whole card is the tap target; image zooms slightly on press.
export function RoomCard({
  image,
  name,
  subtitle,
  priceText,
  perNight,
  meta,
  ctaLabel,
  onSelect,
  className,
}: {
  image: string;
  name: string;
  subtitle?: string;
  priceText: string;
  perNight: string;
  meta: string;
  ctaLabel: string;
  onSelect?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group block w-full overflow-hidden rounded-2xl bg-hotel-surface text-left shadow-xl shadow-black/35 transition-transform active:scale-[0.99] ${className ?? ''}`}
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-hotel-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-active:scale-[1.04]"
        />
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-serif text-xl font-bold leading-tight text-hotel-text-primary">{name}</h3>
          <p className="shrink-0 whitespace-nowrap pt-0.5 font-serif text-lg leading-none">
            <span className="text-hotel-peach">{priceText}</span>
            <span className="ml-1 font-hotel text-[11px] text-hotel-text-muted">{perNight}</span>
          </p>
        </div>

        <div className="hotel-rule" />

        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate font-hotel text-sm text-hotel-text-muted">
            {subtitle ? `${subtitle} · ` : ''}
            {meta}
          </p>
          <span className="inline-flex shrink-0 items-center gap-1 font-hotel text-sm font-medium text-hotel-peach">
            {ctaLabel}
            <ArrowRight size={15} className="transition-transform group-active:translate-x-0.5" />
          </span>
        </div>
      </div>
    </button>
  );
}
