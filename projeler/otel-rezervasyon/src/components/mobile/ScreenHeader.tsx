import { ChevronLeft } from 'lucide-react';

// Shared editorial screen header — eyebrow + oversized serif, optional back row.
// Standardizes the title scale across every mobile screen (Home/Rooms language).
export function ScreenHeader({
  eyebrow,
  title,
  onBack,
  backLabel,
  size = 'h1',
}: {
  eyebrow: string;
  title: string;
  onBack?: () => void;
  backLabel?: string;
  size?: 'h1' | 'h2';
}) {
  const titleCls =
    size === 'h1'
      ? 'font-serif text-[2.4rem] font-bold leading-[1.02] tracking-tight text-hotel-text-primary'
      : 'font-serif text-[2rem] font-bold leading-[1.05] tracking-tight text-hotel-text-primary';

  return (
    <div className="space-y-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 flex items-center gap-0.5 font-hotel text-base text-hotel-text-primary"
        >
          <ChevronLeft size={20} />
          {backLabel}
        </button>
      )}
      <div>
        <p className="hotel-eyebrow">{eyebrow}</p>
        {size === 'h1' ? (
          <h1 className={`mt-1.5 ${titleCls}`}>{title}</h1>
        ) : (
          <h2 className={`mt-1.5 ${titleCls}`}>{title}</h2>
        )}
      </div>
    </div>
  );
}
