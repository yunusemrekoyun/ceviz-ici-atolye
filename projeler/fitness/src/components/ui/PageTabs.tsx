import Link from "next/link";
import { cn } from "@/lib/utils";

type Tab = { key: string; label: string };

export function PageTabs({
  tabs,
  active,
  baseHref,
}: {
  tabs: Tab[];
  active: string;
  baseHref: string;
}) {
  return (
    <div className="flex border-b border-subtle">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={`${baseHref}?tab=${t.key}`}
          className={cn(
            "px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
            active === t.key
              ? "border-neon text-neon"
              : "border-transparent text-muted hover:text-dim"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
