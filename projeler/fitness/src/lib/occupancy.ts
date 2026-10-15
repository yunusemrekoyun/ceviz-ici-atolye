import { prisma } from "@/lib/prisma";

// Salonda "şu an" kim var: son 3 saat içinde giriş yapmış ve çıkışı
// işaretlenmemiş kayıtlar. Check-out çoğu zaman girilmediği için pencere
// tipik bir antrenman süresinin üstünde tutuldu.
const PRESENCE_WINDOW_MS = 3 * 60 * 60 * 1000;

export type OccupancyLevel = "sakin" | "orta" | "yogun";

export interface Occupancy {
  count: number;
  level: OccupancyLevel;
  label: string;
}

export async function getCurrentOccupancy(): Promise<Occupancy> {
  const cutoff = new Date(Date.now() - PRESENCE_WINDOW_MS);
  const count = await prisma.attendance.count({
    where: { checkIn: { gte: cutoff }, checkOut: null },
  });

  const level: OccupancyLevel = count <= 5 ? "sakin" : count <= 15 ? "orta" : "yogun";
  const label = level === "sakin" ? "Sakin" : level === "orta" ? "Orta yoğunlukta" : "Yoğun";

  return { count, level, label };
}
