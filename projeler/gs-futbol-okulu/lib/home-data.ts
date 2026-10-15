import { listAgeGroups } from "@/lib/age-groups-db";
import { todayKey } from "@/lib/billing";
import { directionLinks } from "@/lib/maps";
import { ensureSessionsWindow, listSchedules, listSessions, listVenues } from "@/lib/program";
import { clockNow } from "@/lib/training-rights";
import { addDaysTo } from "@/lib/dates";

/**
 * Ana sayfanın gösterdiği her şey panelden gelir: gruplar (doğum yılı aralığı), haftalık program, saha ve yol
 * tarifi, her grubun sıradaki antrenmanı. Yönetim grubu ya da saati değiştirince sayfa kendiliğinden güncellenir.
 */

export const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"] as const;

export type HomeSlot = { weekday: number; start: string; end: string; venueId: number | null };
export type HomeVenue = { id: number; name: string; address: string | null; google: string; apple: string };
export type HomeGroup = {
  id: number;
  name: string;
  minYear: number;
  maxYear: number;
  /** Bugünkü yaş aralığı ("9–11"). */
  ages: string;
  slots: HomeSlot[];
  /** Sıradaki (iptal edilmemiş, bitmemiş) antrenman. */
  next: { date: string; start: string } | null;
};
export type HomeData = {
  today: string;
  groups: HomeGroup[];
  venues: HomeVenue[];
  /** Grupların kapsadığı doğum yılları (eskiden yeniye). */
  years: number[];
  /** Okulun yaş aralığı ("4–16"); grup yoksa null. */
  ageSpan: string | null;
};

/** Bugünkü yaş aralığı ("9-11"); sayfada uzun tire kullanılmaz. */
function ageRange(minYear: number, maxYear: number, today: string): string {
  const year = Number(today.slice(0, 4));
  const lo = Math.max(year - maxYear - 1, 0);
  const hi = year - minYear;
  return lo === hi ? String(hi) : `${lo}-${hi}`;
}

export function loadHomeData(): HomeData {
  const today = todayKey();
  const clock = clockNow();
  ensureSessionsWindow();
  const groups = listAgeGroups();
  const schedules = listSchedules().filter((s) => !s.validTo || s.validTo >= today);
  const sessions = listSessions({ from: today, to: addDaysTo(today, 21), groupIds: groups.map((g) => g.id) });
  const usedVenues = new Set(schedules.map((s) => s.venueId).filter((v): v is number => v !== null));

  const homeGroups: HomeGroup[] = groups
    .map((g) => {
      const next = sessions.find((s) => s.groupId === g.id && (s.date > clock.day || (s.date === clock.day && s.endTime > clock.time)));
      return {
        id: g.id,
        name: g.name,
        minYear: g.minBirthYear,
        maxYear: g.maxBirthYear,
        ages: ageRange(g.minBirthYear, g.maxBirthYear, today),
        slots: schedules
          .filter((s) => s.groupId === g.id)
          .map((s) => ({ weekday: s.weekday, start: s.startTime, end: s.endTime, venueId: s.venueId }))
          .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start)),
        next: next ? { date: next.date, start: next.startTime } : null,
      };
    })
    // Küçükten büyüğe: en yeni doğum yılı önce
    .sort((a, b) => b.maxYear - a.maxYear);

  const venues: HomeVenue[] = listVenues(true)
    .filter((v) => usedVenues.has(v.id) || (usedVenues.size === 0 && v.active))
    .map((v) => {
      const [google, apple] = directionLinks(v);
      return { id: v.id, name: v.name, address: v.address, google: google!.href, apple: apple!.href };
    });

  const years: number[] = [];
  if (homeGroups.length) {
    const lo = Math.min(...homeGroups.map((g) => g.minYear));
    const hi = Math.max(...homeGroups.map((g) => g.maxYear));
    for (let y = lo; y <= hi; y++) years.push(y);
  }
  const ageSpan = years.length ? ageRange(years[0]!, years.at(-1)!, today) : null;
  return { today, groups: homeGroups, venues, years, ageSpan };
}

