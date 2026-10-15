import { cn } from '@/lib/utils';

/**
 * Marka işareti — "estate" amblemi: fildişi disk içinde pirinç güneş ve
 * çam yeşili tepeler (toprak/arazi motifi). Yeşil bantlar dahil her zeminde
 * okunur. Yazı markası Bricolage ile tek satır.
 */
export function Logo({
  brand = 'Kütahya Satılık Tarla',
  className,
  tone = 'dark',
}: {
  brand?: string;
  className?: string;
  tone?: 'dark' | 'light';
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" role="img" aria-hidden="true">
        <circle cx="20" cy="20" r="19" fill="#F7F3EA" />
        <clipPath id="kst-emblem">
          <circle cx="20" cy="20" r="19" />
        </clipPath>
        <g clipPath="url(#kst-emblem)">
          <circle cx="26.5" cy="15" r="4.6" fill="#B0813E" />
          <path d="M-2 29 Q11 21 22 28 T42 26 V42 H-2 Z" fill="#2C6B4B" />
          <path d="M-2 33.5 Q13 26.5 26 33 T42 31 V42 H-2 Z" fill="#163A2C" />
        </g>
        <circle
          cx="20"
          cy="20"
          r="18.25"
          fill="none"
          stroke="#163A2C"
          strokeOpacity="0.12"
          strokeWidth="1.5"
        />
      </svg>
      <span
        className={cn(
          'font-heading text-[19px] font-bold leading-none tracking-[-0.02em]',
          tone === 'light' ? 'text-primary-foreground' : 'text-foreground',
        )}
      >
        {brand}
      </span>
    </span>
  );
}
