import Link from "next/link";
import { ChevronLeft, Hand } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Panelin ortak yapı taşları (sunucu ve istemci bileşenlerinden kullanılabilir).
 * Sayfa kabı, başlık, bölüm kartı, rozet, boş durum, avatar, bilgi listesi.
 */

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const WIDTHS = { narrow: "max-w-3xl", default: "max-w-6xl", wide: "max-w-7xl" } as const;

export function Page({ width = "default", className, children }: { width?: keyof typeof WIDTHS; className?: string; children: ReactNode }) {
  return <main className={cx("panel-rise mx-auto w-full px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7", WIDTHS[width], className)}>{children}</main>;
}

export function PageHeader({
  title,
  description,
  back,
  actions,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-5 lg:mb-6">
      {back ? (
        <Link href={back.href} className="-ml-1 mb-1 inline-flex min-h-8 items-center gap-0.5 rounded-lg pr-2 text-sm font-medium text-muted transition hover:text-ink pointer-coarse:min-h-11">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[26px]">{title}</h1>
          {description ? <p className="mt-1 max-w-2xl text-[15px] text-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  flush,
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** İçerik kenara kadar (liste, tablo). */
  flush?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={cx("scroll-mt-24 rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgb(28_23_21/0.04)]", className)}>
      {title ? (
        <header className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
        </header>
      ) : null}
      <div className={flush ? (title ? "pt-3" : "") : cx("px-4 pb-4 sm:px-5", title ? "pt-3" : "pt-4")}>{children}</div>
    </section>
  );
}

const TONES = {
  neutral: "bg-stone-100 text-stone-700 ring-stone-500/15",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/25",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  sky: "bg-sky-50 text-sky-800 ring-sky-600/20",
  violet: "bg-violet-50 text-violet-800 ring-violet-600/20",
  brand: "bg-gs-red-soft text-gs-red ring-gs-red/20",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-semibold ring-1 ring-inset", TONES[tone], className)}>{children}</span>;
}

/** Kaleci işareti (listelerde, dosyada, yoklamada aynı görünüm). */
export function KeeperBadge({ className }: { className?: string }) {
  return (
    <Badge tone="neutral" className={cx("gap-0.5", className)}>
      <Hand className="h-3 w-3" aria-hidden="true" /> Kaleci
    </Badge>
  );
}

/** Sayı rozeti (menü, sekme). */
export function Count({ value, tone = "neutral", className }: { value: number; tone?: "neutral" | "alert" | "warn" | "inverse"; className?: string }) {
  const tones = { neutral: "bg-stone-200/70 text-stone-700", alert: "bg-red-600 text-white", warn: "bg-gs-yellow text-black", inverse: "bg-white/20 text-white" };
  return <span className={cx("inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold leading-5 tabular-nums", tones[tone], className)}>{value}</span>;
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon ? <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted [&>svg]:h-5 [&>svg]:w-5">{icon}</span> : null}
      <p className="font-semibold text-ink">{title}</p>
      {children ? <p className="mt-1 max-w-sm text-sm text-muted">{children}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]![0] : "";
  return (first + last).toLocaleUpperCase("tr-TR");
}

const AVATAR_SIZES = { sm: "h-9 w-9 text-xs", md: "h-11 w-11 text-sm", lg: "h-16 w-16 text-lg sm:h-20 sm:w-20 sm:text-xl" } as const;

export function Avatar({ name, photoId, size = "sm", className }: { name: string; photoId?: number | null; size?: keyof typeof AVATAR_SIZES; className?: string }) {
  if (photoId)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- yetki kontrollü dosya adresi
      <img src={`/api/dosya/${photoId}`} alt="" className={cx("shrink-0 rounded-full object-cover ring-1 ring-black/5", AVATAR_SIZES[size], className)} />
    );
  return (
    <span aria-hidden="true" className={cx("flex shrink-0 items-center justify-center rounded-full bg-stone-100 font-semibold text-stone-600 ring-1 ring-inset ring-stone-900/5", AVATAR_SIZES[size], className)}>
      {initials(name)}
    </span>
  );
}

/** Etiket–değer listesi (öğrenci bilgileri gibi). */
export function Facts({ items, columns = 2 }: { items: Array<{ label: string; value: ReactNode; wide?: boolean } | null | false>; columns?: 1 | 2 }) {
  return (
    <dl className={cx("grid gap-x-6 gap-y-3", columns === 2 && "sm:grid-cols-2")}>
      {items.filter(Boolean).map((item) => {
        const it = item as { label: string; value: ReactNode; wide?: boolean };
        return (
          <div key={it.label} className={cx("min-w-0", it.wide && columns === 2 && "sm:col-span-2")}>
            <dt className="text-xs font-medium text-muted">{it.label}</dt>
            <dd className="mt-0.5 break-words text-[15px] text-ink">{it.value === null || it.value === undefined || it.value === "" ? <span className="text-muted">—</span> : it.value}</dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Sekme görünümlü süzgeç (sayılı). */
export function FilterTabs<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; label?: string }) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]" role="tablist" aria-label={label}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cx(
              "flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition pointer-coarse:min-h-10",
              on ? "bg-ink text-white" : "text-muted hover:bg-stone-200/60 hover:text-ink",
            )}
          >
            {o.label}
            {o.count !== undefined && o.count >= 0 ? <span className={cx("rounded-full px-1.5 text-xs tabular-nums", on ? "bg-white/20" : "bg-stone-200/70 text-stone-600")}>{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Link görünümlü küçük eylem (bölüm başlıklarında). */
export function TextLink({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  const cls = "inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-gs-red transition hover:bg-gs-red-soft pointer-coarse:min-h-11";
  return external ? (
    <a href={href} target="_blank" rel="noopener" className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/** Buton görünümlü bağlantı (Button ile aynı ölçüler). */
export function ButtonLink({
  href,
  children,
  variant = "secondary",
  size = "md",
  className,
  external,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  external?: boolean;
}) {
  const sizes = { sm: "min-h-9 rounded-lg px-3 text-sm pointer-coarse:min-h-11", md: "min-h-10 rounded-xl px-4 text-[15px] pointer-coarse:min-h-11", lg: "min-h-12 rounded-xl px-5" };
  const variants = {
    primary: "bg-gs-red text-white hover:bg-gs-red-dark",
    secondary: "border border-control bg-white text-ink shadow-xs hover:border-gray-400 hover:bg-gray-50",
    ghost: "text-gs-red hover:bg-gs-red-soft",
  };
  const cls = cx("inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition duration-150 active:scale-[0.97]", sizes[size], variants[variant], className);
  return external ? (
    <a href={href} target="_blank" rel="noopener" className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
