import Link from "next/link";
import { Count } from "./kit";

export type SectionTab = { href: string; label: string; count?: number; tone?: "neutral" | "warn" | "alert" };

/**
 * Aynı işin alt sayfaları arasında geçiş (ör. Adaylar: Başvurular · Randevular · Aramalar).
 * Telefonda tam genişlik, eşit bölmeli; masaüstünde içerik kadar.
 */
export function SectionTabs({ items, active, label }: { items: SectionTab[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="mb-4 grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-stone-200/60 p-1 sm:inline-grid">
      {items.map((t) => {
        const on = t.href === active;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={[
              "inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition sm:px-4",
              on ? "bg-white text-ink shadow-[0_1px_2px_rgb(28_23_21/0.08)]" : "text-muted hover:text-ink",
            ].join(" ")}
          >
            {t.label}
            {t.count ? <Count value={t.count} tone={t.tone ?? "neutral"} /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/** Aday sayfaları: başvuru, randevu, arama talebi. */
export function CandidateTabs({ active, pending, overdue }: { active: "registrations" | "appointments" | "callbacks"; pending?: number; overdue?: number }) {
  return (
    <SectionTabs
      label="Adaylar"
      active={{ registrations: "/admin/on-kayitlar", appointments: "/admin/randevular", callbacks: "/admin/arama-talepleri" }[active]}
      items={[
        { href: "/admin/on-kayitlar", label: "Başvurular", count: pending, tone: "warn" },
        { href: "/admin/randevular", label: "Randevular", count: overdue, tone: "alert" },
        { href: "/admin/arama-talepleri", label: "Aramalar" },
      ]}
    />
  );
}
