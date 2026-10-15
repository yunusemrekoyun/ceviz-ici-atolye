// Rozetler ve haftalık seri tamamen Attendance verisinden türetilir —
// ayrıca tablo tutulmaz, üye her bakışta güncel durumunu görür.

export interface BadgeDef {
  id: string;
  label: string;
  emoji: string;
  kind: "visits" | "streak";
  threshold: number;
}

export const BADGES: BadgeDef[] = [
  { id: "visit-1",    label: "İlk Adım",         emoji: "👟", kind: "visits", threshold: 1 },
  { id: "visit-10",   label: "Isınma Bitti",     emoji: "💪", kind: "visits", threshold: 10 },
  { id: "visit-25",   label: "Müdavim",          emoji: "🏋️", kind: "visits", threshold: 25 },
  { id: "visit-50",   label: "Demirbaş",         emoji: "🥇", kind: "visits", threshold: 50 },
  { id: "visit-100",  label: "Yüzler Kulübü",    emoji: "🏆", kind: "visits", threshold: 100 },
  { id: "visit-250",  label: "Efsane",           emoji: "🐐", kind: "visits", threshold: 250 },
  { id: "streak-2",   label: "Seri Başladı",     emoji: "🔥", kind: "streak", threshold: 2 },
  { id: "streak-4",   label: "1 Aylık Seri",     emoji: "⚡", kind: "streak", threshold: 4 },
  { id: "streak-8",   label: "2 Aylık Seri",     emoji: "🚀", kind: "streak", threshold: 8 },
  { id: "streak-12",  label: "Çeyrek Yıl",       emoji: "💎", kind: "streak", threshold: 12 },
];

export interface Achievements {
  totalVisits: number;
  weeklyStreak: number;
  visitedThisWeek: boolean;
  earned: BadgeDef[];
  nextBadge: { badge: BadgeDef; current: number } | null;
}

// Pazartesi başlangıçlı hafta anahtarı (yerel saat).
function weekStart(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // Pazartesi=0
  x.setDate(x.getDate() - day);
  return x.getTime();
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function computeAchievements(checkIns: Date[]): Achievements {
  const totalVisits = checkIns.length;
  const weeks = new Set(checkIns.map(weekStart));

  const thisWeek = weekStart(new Date());
  const visitedThisWeek = weeks.has(thisWeek);

  // Seri, bu haftadan (gelinmediyse geçen haftadan) geriye doğru sayılır —
  // hafta henüz bitmediği için bu haftaki boşluk seriyi bozmaz.
  let cursor = visitedThisWeek ? thisWeek : thisWeek - WEEK_MS;
  let weeklyStreak = 0;
  while (weeks.has(cursor)) {
    weeklyStreak++;
    cursor -= WEEK_MS;
  }

  const valueOf = (b: BadgeDef) => (b.kind === "visits" ? totalVisits : weeklyStreak);
  const earned = BADGES.filter((b) => valueOf(b) >= b.threshold);

  const remaining = BADGES.filter((b) => valueOf(b) < b.threshold)
    .sort((a, b) => (a.threshold - valueOf(a)) / a.threshold - (b.threshold - valueOf(b)) / b.threshold);
  const nextBadge = remaining[0] ? { badge: remaining[0], current: valueOf(remaining[0]) } : null;

  return { totalVisits, weeklyStreak, visitedThisWeek, earned, nextBadge };
}
