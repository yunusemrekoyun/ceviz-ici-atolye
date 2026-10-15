import { listAgeGroups } from "@/lib/age-groups-db";
import { listAnnouncements, type AnnouncementView } from "@/lib/announcements";
import { guardianExcusedSessions, studentAttendance, summarize, type AttendanceSummary } from "@/lib/attendance";
import { accessOf, latestClaim, listPayments, todayKey } from "@/lib/billing";
import { discountedFee, payStatus, type Access, type PayStatus } from "@/lib/billing-shared";
import type { Registration, Venue } from "@/lib/db/schema";
import { evaluationsOf } from "@/lib/development";
import { listOrders } from "@/lib/equipment";
import { hasSocks, shirtLabel } from "@/lib/equipment-shared";
import { groupAgeRange } from "@/lib/export/extras";
import { consentStatesForRegistration } from "@/lib/legal";
import { ensureSessionsWindow, listVenues, upcomingForGroups, type SessionView } from "@/lib/program";
import { weeklyProgram, type ProgramSlot } from "@/lib/program-sheets";
import { getSettings } from "@/lib/settings";

/**
 * Veli ekranlarının tek kaynağı: bir çocuk için "şu an ne durumda" özeti. Ana sayfa ve Profil aynı veriyi gösterir;
 * veliye sade cümlelerle anlatılacak her şey burada hesaplanır (ödeme dili, sıradaki antrenman, son antrenmanlar).
 */

/** Forma takımında tozluk ayrı teslim edilir; numarası ve durumu ayrı satırda. */
export type KitLine = { name: string; size: string | null; text: string; tone: "good" | "warn" | "neutral"; sock: { size: string | null; text: string; tone: "good" | "neutral" } | null };

export type ChildSummary = {
  child: Registration;
  firstName: string;
  group: { id: number; name: string; years: string; ages: string } | null;
  coaches: string[];
  slots: ProgramSlot[];
  venue: Venue | null;
  next: SessionView | null;
  /** Veli sıradaki antrenman için "gelemeyecek" bildirdi. */
  nextExcused: boolean;
  cancelledSoon: SessionView[];
  access: Access;
  pay: PayStatus;
  /** İndirimli 8 antrenmanlık aidat. */
  fee: number;
  claimPending: boolean;
  claimRejected: boolean;
  payments: { id: number; paidOn: string; amountKurus: number; method: string; receiptNo: string; sessions: number }[];
  /** Son antrenmanlar (eskiden yeniye) ve özet. */
  recent: { date: string; status: string }[];
  attendance: AttendanceSummary;
  evaluation: { evaluatedOn: string; average: number; comment: string | null } | null;
  kit: KitLine[];
  consents: { title: string; required: boolean; ok: boolean }[];
  news: AnnouncementView | null;
};

const DELIVERY: Record<string, string> = { delivered: "teslim edildi", to_order: "sipariş verilecek", ordered: "sipariş verildi, gelmesi bekleniyor", waiting: "teslim edilmedi" };

export function childSummary(child: Registration, today: string = todayKey()): ChildSummary {
  const g = child.groupId ? listAgeGroups().find((x) => x.id === child.groupId) : undefined;
  const row = g ? weeklyProgram(today).rows.find((r) => r.groupId === g.id) : undefined;
  ensureSessionsWindow();
  const sessions = g ? upcomingForGroups([g.id], 21) : [];
  const next = sessions.find((s) => s.status === "scheduled" && s.date >= today) ?? null;
  const venues = listVenues(true);
  const venue = (next?.venueId ? venues.find((v) => v.id === next.venueId) : null) ?? (row?.slots[0] ? (venues.find((v) => v.name === row.slots[0]!.venue) ?? null) : null);
  const access = accessOf(child, today);
  const claim = latestClaim(child.id);
  const payments = listPayments({ registrationId: child.id, limit: 12 }).filter((p) => !p.voidedAt);
  const last = payments[0];
  const records = studentAttendance(child.id, 200);
  const ev = evaluationsOf(child.id)[0];
  const scores = ev ? Object.values(ev.scores) : [];
  return {
    child,
    firstName: child.studentFullName.split(" ")[0] ?? child.studentFullName,
    group: g ? { id: g.id, name: g.name, years: g.minBirthYear === g.maxBirthYear ? String(g.minBirthYear) : `${g.minBirthYear}–${g.maxBirthYear}`, ages: groupAgeRange(g.minBirthYear, g.maxBirthYear, today) } : null,
    coaches: row?.coaches ?? [],
    slots: row?.slots ?? [],
    venue,
    next,
    nextExcused: next ? guardianExcusedSessions(child.id, [next.id]).has(next.id) : false,
    cancelledSoon: sessions.filter((s) => s.status === "cancelled").slice(0, 2),
    access,
    pay: payStatus(access, today),
    fee: discountedFee(getSettings().feeAmountKurus, child.discountPercent),
    claimPending: claim?.status === "pending",
    claimRejected: claim?.status === "rejected" && (!last || last.createdAt < (claim.decidedAt ?? "")),
    payments: payments.slice(0, 6).map((p) => ({ id: p.id, paidOn: p.paidOn, amountKurus: p.amountKurus, method: p.method, receiptNo: p.receiptNo, sessions: p.periodCount * 8 })),
    recent: records
      .slice(0, 8)
      .reverse()
      .map((r) => ({ date: r.date, status: r.status })),
    attendance: summarize(records),
    evaluation: ev ? { evaluatedOn: ev.evaluatedOn, average: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0, comment: ev.comment } : null,
    kit: listOrders()
      .filter((o) => o.registrationId === child.id)
      .map((o) => ({
        name: o.itemName,
        size: shirtLabel(o.size),
        text: o.owned ? "kendisinde var" : !o.paid ? `parası bekleniyor · ${DELIVERY[o.delivery] ?? o.delivery}` : DELIVERY[o.delivery] ?? o.delivery,
        tone: o.owned || (o.paid && o.delivery === "delivered") ? "good" : !o.paid ? "warn" : "neutral",
        sock:
          hasSocks(o.itemName) && !o.owned
            ? { size: o.sockSize, text: DELIVERY[o.sockDelivery ?? "waiting"] ?? "teslim edilmedi", tone: o.sockDelivery === "delivered" ? "good" : "neutral" }
            : null,
      })),
    consents: consentStatesForRegistration(child.id).map((c) => ({ title: c.text.title, required: c.text.consentType === "required", ok: c.current && Boolean(c.last?.accepted) })),
    news: g ? (listAnnouncements({ groupIds: [g.id], limit: 1 })[0] ?? null) : (listAnnouncements({ limit: 1 })[0] ?? null),
  };
}
