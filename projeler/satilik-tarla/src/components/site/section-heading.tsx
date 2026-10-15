import { Reveal } from '@/components/motion/reveal';
import { cn } from '@/lib/utils';

/**
 * Editorial bölüm başlığı: sola yaslı indeks + pirinç tire + eyebrow,
 * altında büyük Bricolage başlık; alt başlık geniş ekranda sağ sütunda
 * taban hizasına oturur (dergi düzeni, ortalanmış şablon kalıbı değil).
 */
export function SectionHeading({
  index,
  eyebrow,
  title,
  subtitle,
  className,
}: {
  index?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <Reveal className={className}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
        <div>
          {eyebrow ? (
            <p className="flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-brass-strong">
              {index ? (
                <span className="nums" aria-hidden="true">
                  {index}
                </span>
              ) : null}
              <span className="draw-dash h-0.5 w-8 bg-brass" aria-hidden="true" />
              {eyebrow}
            </p>
          ) : null}
          <h2
            className={cn(
              'max-w-2xl font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]',
              eyebrow && 'mt-4',
            )}
          >
            {title}
          </h2>
        </div>
        {subtitle ? (
          <p className="max-w-md text-[17px] leading-relaxed text-muted-foreground lg:pb-1.5">
            {subtitle}
          </p>
        ) : null}
      </div>
    </Reveal>
  );
}
