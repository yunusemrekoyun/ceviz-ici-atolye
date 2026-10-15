import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Eş yükselti eğrileri — kadastro/pafta motifi. Koyu bantlarda çok soluk
 * (text-white/[0.05] gibi) dekoratif katman olarak kullanılır.
 */
export function TopoLines({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 960 600"
      preserveAspectRatio="xMidYMid slice"
      className={cn('pointer-events-none absolute', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden="true"
    >
      {/* Akış hatları */}
      <path d="M-40 520 C 120 470 260 500 380 450 C 500 400 560 430 700 380 C 820 337 900 360 1000 320" />
      <path d="M-40 580 C 140 530 300 560 430 505 C 560 450 640 480 780 430 C 890 391 950 410 1000 380" />
      {/* Sol tepe grubu */}
      <path d="M120 90 C 60 140 80 220 160 250 C 240 280 340 250 360 180 C 380 110 320 60 240 60 C 190 60 155 70 120 90 Z" />
      <path d="M150 115 C 105 150 118 210 178 232 C 238 254 312 230 328 178 C 344 126 298 88 238 88 C 200 88 178 96 150 115 Z" />
      <path d="M180 140 C 150 162 158 200 196 214 C 234 228 282 212 292 178 C 302 144 272 118 232 118 C 208 118 196 126 180 140 Z" />
      {/* Sağ tepe grubu */}
      <path d="M700 60 C 640 90 630 160 690 200 C 750 240 850 220 880 160 C 905 110 870 55 800 45 C 763 40 733 45 700 60 Z" />
      <path d="M730 90 C 690 110 685 160 728 188 C 771 216 838 200 858 158 C 875 122 850 82 800 75 C 775 72 753 78 730 90 Z" />
    </svg>
  );
}

/** Pafta köşe işareti — kesikli parsel çerçevesinin köşelerine oturur. */
export function CornerMark({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={cn('absolute h-3 w-3 text-brass', className)}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M1 11V1h10" />
    </svg>
  );
}

/**
 * Ölçülmüş parsel çerçevesi — içeriği dört pafta köşe işaretiyle sarar.
 * Hero'daki kadastro dilini alt sayfalara taşır (galeri, bilgi, başlık).
 * İşaretler çerçevenin biraz dışında durur; her zeminde görünür kalır.
 */
export function ParcelFrame({
  children,
  className,
  tone = 'brass',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'brass' | 'ondark';
}) {
  const color = tone === 'ondark' ? 'text-brass-ondark' : 'text-brass';
  return (
    <div className={cn('relative', className)}>
      {children}
      <CornerMark className={cn('-left-1.5 -top-1.5', color)} />
      <CornerMark className={cn('-right-1.5 -top-1.5 rotate-90', color)} />
      <CornerMark className={cn('-bottom-1.5 -right-1.5 rotate-180', color)} />
      <CornerMark className={cn('-bottom-1.5 -left-1.5 -rotate-90', color)} />
    </div>
  );
}
