import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseIdParam } from "@/lib/api";
import { can, requireAdmin } from "@/lib/auth/server";
import { listItems } from "@/lib/equipment";
import { addDaysTo } from "@/lib/dates";
import { todayKey } from "@/lib/billing";
import { clockNow, groupSessionDates, trainingsOver } from "@/lib/training-rights";
import { weeklyProgram } from "@/lib/program-sheets";
import { listPublishedTexts } from "@/lib/legal";
import { loadBillingView, loadPanelData } from "@/lib/panel-data";
import { EnrollForm } from "./EnrollForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Okula kayıt" };

export default async function EnrollPage({ params }: PageProps<"/admin/kayit/[id]/asil-kayit">) {
  const admin = await requireAdmin("kayit.duzenle");
  const id = parseIdParam((await params).id);
  if (!id) notFound();
  const { registrations, groups } = loadPanelData(new Date(), can(admin, "hassas.gor"));
  const reg = registrations.find((r) => r.id === id);
  if (!reg) notFound();
  const { billing } = loadBillingView([], { view: false, collect: can(admin, "aidat.al") });
  const items = can(admin, "aidat.al") ? listItems().map(({ id, name, priceKurus }) => ({ id, name, priceKurus })) : [];
  // Hak önizlemesi için her grubun yakındaki antrenman günleri (kayıt tarihi dün seçilebilir).
  const from = addDaysTo(todayKey(), -3);
  const sessions: Record<string, string[]> = { "0": groupSessionDates(null, from, 14) };
  for (const g of groups) sessions[String(g.id)] = groupSessionDates(g.id, from, 14);
  // Bugünkü antrenmanı bitmiş gruplar: bugün yapılan kayıtta hak ertesi günden başlar
  const clock = clockNow();
  const over = groups.filter((g) => trainingsOver(g.id, clock.day, clock.time)).map((g) => g.id);
  // Hoş geldin mesajı için grupların haftalık programı ve yol tarifi
  const week = weeklyProgram();
  const program: Record<string, { slots: { weekday: number; startTime: string; text: string }[]; mapUrl: string | null }> = {};
  for (const row of week.rows) {
    const venue = row.slots.find((x) => x.venue)?.venue ?? null;
    program[String(row.groupId)] = {
      slots: row.slots.map((x) => ({ weekday: x.weekday, startTime: x.startTime, text: `${x.day} ${x.startTime}–${x.endTime}${x.venue ? ` · ${x.venue}` : ""}` })),
      mapUrl: week.venues.find((v) => v.name === venue)?.mapUrl ?? null,
    };
  }
  // Kâğıt formdaki onaylar: zorunlu metinlerin adları ve fotoğraf izni metni yayında mı
  const texts = listPublishedTexts();
  const consentTexts = { required: texts.filter(({ text }) => text.consentType === "required").map(({ text }) => text.title), photo: texts.some(({ text }) => text.key === "foto-izni") };
  return <EnrollForm reg={reg} groups={groups} billing={{ ...billing, canPromise: can(admin, "erisim.ac") }} items={items} sessions={sessions} overToday={over} program={program} consentTexts={consentTexts} />;
}
