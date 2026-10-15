"use server";

import { z } from "zod";
import { invalid, runAdmin, type ActionResult } from "@/lib/admin-action";
import { parseMoney, formatMoney } from "@/lib/billing-shared";
import { invalidatePeriodCache } from "@/lib/billing";
import { normalizePhone } from "@/lib/phone";
import { getSettings, setSetting } from "@/lib/settings";

export type SettingsFormValues = {
  fee: string;
  graceDays: string;
  reminderDaysBefore: string;
  absenceAlertCount: string;
  contactPhone: string;
  cardAttendance: boolean;
  evaluationCriteria: string[];
};

const int = (label: string, min: number, max: number) =>
  z.coerce.number({ error: `${label} sayı olmalı.` }).int({ error: `${label} tam sayı olmalı.` }).min(min, { error: `${label} en az ${min}.` }).max(max, { error: `${label} en fazla ${max}.` });

const schema = z.object({
  fee: z.string().transform((v, ctx) => {
    const kurus = parseMoney(v);
    if (kurus === null || kurus > 100_000_00) {
      ctx.addIssue({ code: "custom", message: "Geçerli bir tutar girin (ör. 1500)." });
      return z.NEVER;
    }
    return kurus;
  }),
  graceDays: int("Tolerans", 0, 31),
  reminderDaysBefore: int("Hatırlatma günü", 0, 10),
  absenceAlertCount: int("Devamsızlık eşiği", 1, 20),
  contactPhone: z.string().transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "Geçerli bir telefon girin." });
      return z.NEVER;
    }
    return p;
  }),
  cardAttendance: z.boolean(),
  evaluationCriteria: z
    .array(z.string().trim().max(40, { error: "Kriter adı en fazla 40 karakter." }))
    .transform((a) => [...new Set(a.filter(Boolean))])
    .pipe(z.array(z.string()).min(1, { error: "En az bir değerlendirme kriteri olmalı." }).max(12, { error: "En fazla 12 kriter." })),
});

export async function saveSettingsAction(values: SettingsFormValues): Promise<ActionResult> {
  const parsed = schema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  return runAdmin("ayar.yonet", "save settings", (actor) => {
    const before = getSettings();
    const d = parsed.data;
    setSetting("feeAmountKurus", d.fee, actor.id);
    setSetting("graceDays", d.graceDays, actor.id);
    setSetting("reminderDaysBefore", d.reminderDaysBefore, actor.id);
    setSetting("absenceAlertCount", d.absenceAlertCount, actor.id);
    setSetting("contactPhone", d.contactPhone, actor.id);
    setSetting("cardAttendance", d.cardAttendance, actor.id);
    setSetting("evaluationCriteria", d.evaluationCriteria, actor.id);
    invalidatePeriodCache();
    const changes: string[] = [];
    if (before.feeAmountKurus !== d.fee) changes.push(`aidat ${formatMoney(before.feeAmountKurus)} → ${formatMoney(d.fee)}`);
    if (before.graceDays !== d.graceDays) changes.push(`tolerans ${before.graceDays} → ${d.graceDays} gün`);
    if (before.reminderDaysBefore !== d.reminderDaysBefore) changes.push(`hatırlatma ${d.reminderDaysBefore} gün önce`);
    if (before.absenceAlertCount !== d.absenceAlertCount) changes.push(`devamsızlık eşiği ${d.absenceAlertCount}`);
    if (before.contactPhone !== d.contactPhone) changes.push("iletişim telefonu");
    if (before.cardAttendance !== d.cardAttendance) changes.push(d.cardAttendance ? "kartla yoklama açıldı" : "kartla yoklama kapatıldı");
    if (before.evaluationCriteria.join("|") !== d.evaluationCriteria.join("|")) changes.push("değerlendirme kriterleri");
    return changes.length ? { action: "ayar.kaydet", entity: "settings", summary: `Ayarlar: ${changes.join(", ")}` } : undefined;
  });
}
