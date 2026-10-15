import crypto from "node:crypto";
import { BRAND_NAME } from "@/lib/constants";
import type { SessionView } from "@/lib/program";

/** Grup takvim aboneliği anahtarı: grup numarası + imza (kişisel veri içermez, tahmin edilemez). */
function secret(): string {
  return process.env.CRON_SECRET?.trim() || "gs-takvim";
}

export function calendarKey(groupId: number): string {
  const sig = crypto.createHmac("sha256", secret()).update(`takvim:${groupId}`).digest("base64url").slice(0, 16);
  return `${groupId}-${sig}`;
}

export function parseCalendarKey(key: string): number | null {
  const m = /^(\d{1,6})-([A-Za-z0-9_-]{16})$/.exec(key);
  if (!m) return null;
  const id = Number(m[1]);
  const expected = calendarKey(id);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(key)) ? id : null;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const stamp = (day: string, time: string) => `${day.replace(/-/g, "")}T${time.replace(":", "")}00`;

/** iCalendar (RFC 5545). Saatler Europe/Istanbul; iptaller CANCELLED olarak kalır ki telefonda güncellensin. */
export function buildIcs(groupName: string, sessions: SessionView[]): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kutahya GS Futbol Okullari//Program//TR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(`${groupName} antrenmanları`)}`,
    "X-WR-TIMEZONE:Europe/Istanbul",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    // Türkiye 2016'dan beri sabit UTC+3 (yaz saati yok).
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Istanbul",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0300",
    "TZOFFSETTO:+0300",
    "TZNAME:+03",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
  for (const s of sessions) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:seans-${s.id}@kutahyagsfutbolokulu`,
      `DTSTAMP:${now}`,
      `DTSTART;TZID=Europe/Istanbul:${stamp(s.date, s.startTime)}`,
      `DTEND;TZID=Europe/Istanbul:${stamp(s.date, s.endTime)}`,
      `SUMMARY:${esc(`${s.status === "cancelled" ? "İPTAL · " : ""}${groupName} antrenmanı`)}`,
      ...(s.venue ? [`LOCATION:${esc([s.venue.name, s.venue.address].filter(Boolean).join(", "))}`] : []),
      ...(s.venue?.lat != null && s.venue.lng != null ? [`GEO:${s.venue.lat};${s.venue.lng}`] : []),
      `DESCRIPTION:${esc(s.status === "cancelled" ? `İptal: ${s.cancelReason ?? ""}` : BRAND_NAME)}`,
      `STATUS:${s.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
