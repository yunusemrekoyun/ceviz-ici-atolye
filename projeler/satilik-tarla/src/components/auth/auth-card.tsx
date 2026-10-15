import type { ReactNode } from 'react';
import { ParcelFrame } from '@/components/site/topo';
import { cn } from '@/lib/utils';

/** Kayıt/giriş/şifre sıfırlama sayfalarının ortak dar kart sarmalayıcısı —
 * mevcut pafta köşe işaretiyle ("kadastro" kimliği) çerçevelenir. */
export function AuthCard({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="container flex min-h-[70vh] items-center justify-center py-16 lg:py-24">
      <ParcelFrame className="w-full max-w-md">
        <div className="rounded-lg border border-border bg-card p-6 shadow-soft sm:p-8">
          {eyebrow ? (
            <p className="flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.18em] text-brass-strong">
              <span className="h-0.5 w-8 bg-brass" aria-hidden="true" />
              {eyebrow}
            </p>
          ) : null}
          <h1
            className={cn(
              'font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl',
              eyebrow && 'mt-4',
            )}
          >
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</p>
          ) : null}
          <div className="mt-6">{children}</div>
        </div>
      </ParcelFrame>
    </div>
  );
}

export function fieldLabelClass() {
  return 'mb-2 block text-[12px] font-semibold uppercase tracking-[0.16em] text-muted-foreground';
}
