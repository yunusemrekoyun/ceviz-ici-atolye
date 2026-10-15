import { Flame } from "lucide-react";
import type { Achievements } from "@/lib/achievements";

export function AchievementsCard({ achievements }: { achievements: Achievements }) {
  const { totalVisits, weeklyStreak, visitedThisWeek, earned, nextBadge } = achievements;

  // Hiç check-in yoksa üyeyi boş bir vitrine bakmaya zorlamayalım.
  if (totalVisits === 0) return null;

  const pct = nextBadge
    ? Math.min(100, Math.round((nextBadge.current / nextBadge.badge.threshold) * 100))
    : 100;

  return (
    <div className="card-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl grid place-items-center ${weeklyStreak > 0 ? "bg-orange-500/15" : "bg-subtle"}`}>
            <Flame className={`w-6 h-6 ${weeklyStreak > 0 ? "text-orange-400" : "text-muted"}`} />
          </div>
          <div>
            <div className="font-semibold">
              {weeklyStreak > 0 ? `${weeklyStreak} haftalık seri` : "Serine başla"}
            </div>
            <div className="text-xs text-muted mt-0.5">
              {weeklyStreak > 0
                ? visitedThisWeek
                  ? "Bu hafta geldin, seri devam ediyor 🔥"
                  : "Bu hafta bir kez gel, seri bozulmasın"
                : "Bu hafta salona bir kez gel, serin başlasın"}
            </div>
          </div>
        </div>

        {nextBadge && (
          <div className="min-w-[160px]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted">Sıradaki: {nextBadge.badge.emoji} {nextBadge.badge.label}</span>
              <span className="text-faint">{nextBadge.current}/{nextBadge.badge.threshold}</span>
            </div>
            <div className="h-1.5 rounded-full bg-subtle overflow-hidden">
              <div className="h-full rounded-full bg-neon transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>

      {earned.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {earned.map((b) => (
            <span
              key={b.id}
              title={b.kind === "visits" ? `${b.threshold} check-in` : `${b.threshold} haftalık seri`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neon/10 border border-neon/20 text-xs font-medium"
            >
              <span>{b.emoji}</span> {b.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
