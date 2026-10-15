import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  delta?: number;
  icon: LucideIcon;
  hint?: string;
  accent?: "neon" | "cyan" | "violet" | "amber";
};

const accents: Record<NonNullable<Props["accent"]>, string> = {
  neon: "from-neon/20 to-neon/5 border-neon/20 text-neon",
  cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-300",
  violet: "from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-300",
  amber: "from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-300",
};

export function StatCard({ label, value, delta, icon: Icon, hint, accent = "neon" }: Props) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="card-surface p-5 relative overflow-hidden group">
      <div className={cn("absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br blur-2xl opacity-50 group-hover:opacity-80 transition-opacity", accents[accent])} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs text-body">{label}</div>
          <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
          {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
        </div>
        <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br border grid place-items-center", accents[accent])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      {typeof delta === "number" && (
        <div className={cn("relative mt-3 inline-flex items-center gap-1 text-xs font-medium", positive ? "text-emerald-300" : "text-rose-300")}>
          {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(delta)}% <span className="text-muted font-normal">geçen aya göre</span>
        </div>
      )}
    </div>
  );
}
