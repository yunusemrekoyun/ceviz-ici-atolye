"use server";

import { z } from "zod";
import { idSchema, invalid, runAdmin, type ActionResult } from "@/lib/admin-action";
import { createAnnouncement } from "@/lib/announcements";
import { dayLabel } from "@/lib/billing-shared";
import { notifyGuardiansOfGroups } from "@/lib/guardian-notify";
import {
  cancelSession,
  createExtraSession,
  deleteSchedule,
  ensureSessionsWindow,
  getSession,
  invalidateSessionWindow,
  moveSchema,
  moveSession,
  ProgramError,
  restoreSession,
  saveSchedule,
  saveVenue,
  scheduleSchema,
  setGroupCoaches,
  setVenueActive,
  venueSchema,
  WEEKDAYS,
} from "@/lib/program";

const run = (scope: string, fn: Parameters<typeof runAdmin>[2]) => runAdmin("program.yonet", scope, fn, [ProgramError]);

export type VenueFormValues = { name: string; address: string; location: string; note: string };
export type ScheduleFormValues = { groupId: string; weekday: string; startTime: string; endTime: string; venueId: string; validFrom: string; validTo: string };
export type MoveFormValues = { date: string; startTime: string; endTime: string; venueId: string };

export async function saveVenueAction(id: number | null, values: VenueFormValues): Promise<ActionResult> {
  if (id !== null && !idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz saha." };
  const parsed = venueSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  return run("save venue", () => {
    const v = saveVenue(id, parsed.data);
    return { action: id ? "saha.duzenle" : "saha.ekle", entity: "venue", entityId: v.id, summary: `Saha: ${v.name}` };
  });
}

export async function setVenueActiveAction(id: number, active: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz saha." };
  return run("venue active", () => {
    const v = setVenueActive(id, active);
    return { action: "saha.durum", entity: "venue", entityId: id, summary: `${v.name} ${active ? "etkin" : "kullanım dışı"}` };
  });
}

export async function saveScheduleAction(id: number | null, values: ScheduleFormValues): Promise<ActionResult> {
  if (id !== null && !idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz program." };
  const parsed = scheduleSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  return run("save schedule", () => {
    const s = saveSchedule(id, parsed.data);
    invalidateSessionWindow();
    ensureSessionsWindow(true);
    return { action: id ? "program.duzenle" : "program.ekle", entity: "schedule", entityId: s.id, summary: `Grup #${s.groupId}: ${WEEKDAYS[s.weekday - 1]} ${s.startTime}–${s.endTime}` };
  });
}

export async function deleteScheduleAction(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz program." };
  return run("delete schedule", () => {
    deleteSchedule(id);
    invalidateSessionWindow();
    return { action: "program.sil", entity: "schedule", entityId: id, summary: "Program satırı silindi" };
  });
}

export async function setGroupCoachesAction(groupId: number, userIds: number[]): Promise<ActionResult> {
  if (!idSchema.safeParse(groupId).success || !z.array(idSchema).max(50).safeParse(userIds).success) return { ok: false, error: "Geçersiz istek." };
  return run("group coaches", () => {
    setGroupCoaches(groupId, userIds);
    return { action: "grup.antrenor", entity: "age_group", entityId: groupId, summary: `Antrenörler: ${userIds.length} kişi`, data: userIds };
  });
}

export async function cancelSessionAction(id: number, reason: string, announce: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz seans." };
  const r = z.string().trim().min(3, { error: "İptal nedenini yazın." }).max(300).safeParse(reason);
  if (!r.success) return invalid(r.error);
  return run("cancel session", (actor) => {
    const s = cancelSession(id, r.data);
    const view = getSession(id);
    if (announce && view) {
      const title = `${view.groupName} antrenmanı iptal`;
      const body = `${dayLabel(s.date)} ${s.startTime} antrenmanı iptal edildi. Neden: ${r.data}`;
      createAnnouncement({ title, body, groupIds: [s.groupId], kind: "cancel", sessionId: s.id, userId: actor.id });
      notifyGuardiansOfGroups([s.groupId], { kind: "program.iptal", title, body, link: "/veli" });
    }
    return { action: "seans.iptal", entity: "session", entityId: id, summary: `${view?.groupName ?? ""} ${s.date} ${s.startTime} iptal (${r.data})` };
  });
}

export async function restoreSessionAction(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz seans." };
  return run("restore session", () => {
    const s = restoreSession(id);
    return { action: "seans.geri-al", entity: "session", entityId: id, summary: `${s.date} ${s.startTime} seansı yeniden açıldı` };
  });
}

export async function moveSessionAction(id: number, values: MoveFormValues, announce: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz seans." };
  const parsed = moveSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  return run("move session", (actor) => {
    const before = getSession(id);
    const s = moveSession(id, parsed.data);
    const after = getSession(id);
    if (announce && before && after) {
      const title = `${after.groupName} antrenmanı değişti`;
      const body = `${dayLabel(before.date)} ${before.startTime} antrenmanı ${dayLabel(s.date)} ${s.startTime}–${s.endTime}${after.venueName ? ` (${after.venueName})` : ""} olarak değişti.`;
      createAnnouncement({ title, body, groupIds: [s.groupId], kind: "cancel", sessionId: s.id, userId: actor.id });
      notifyGuardiansOfGroups([s.groupId], { kind: "program.degisti", title, body, link: "/veli" });
    }
    return { action: "seans.tasi", entity: "session", entityId: id, summary: `${before?.date} ${before?.startTime} → ${s.date} ${s.startTime}` };
  });
}

export async function addSessionAction(groupId: number, values: MoveFormValues): Promise<ActionResult> {
  if (!idSchema.safeParse(groupId).success) return { ok: false, error: "Geçersiz grup." };
  const parsed = moveSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  return run("add session", () => {
    const s = createExtraSession(groupId, parsed.data);
    return { action: "seans.ekle", entity: "session", entityId: s.id, summary: `Ek seans: grup #${groupId} ${s.date} ${s.startTime}` };
  });
}
