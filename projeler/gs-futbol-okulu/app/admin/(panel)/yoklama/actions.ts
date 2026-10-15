"use server";

import { z } from "zod";
import { runAdmin, UserError, type ActionResult } from "@/lib/admin-action";
import { earliestSessionDate } from "@/lib/attendance-grid";
import { invalidatePeriodCache, todayKey } from "@/lib/billing";
import { addDaysTo } from "@/lib/dates";
import { formatDateTr } from "@/lib/format";
import { ensureSessions } from "@/lib/program";

/** Kağıtta sistemden önceki antrenmanlar varsa: o günden sistemdeki ilk antrenmana kadar programdan antrenman ekler. */
export async function extendGridStartAction(from: string): Promise<ActionResult> {
  const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(from);
  if (!day.success) return { ok: false, error: "Geçerli bir tarih seçin." };
  return runAdmin("program.yonet", "extend sessions back", () => {
    const today = todayKey();
    const first = earliestSessionDate() ?? today;
    if (day.data >= first) throw new UserError(`Tablo zaten ${formatDateTr(first)} tarihinden başlıyor.`);
    if (day.data < addDaysTo(today, -200)) throw new UserError("Bu kadar eski bir tarih seçilemez.");
    const created = ensureSessions(day.data, addDaysTo(first, -1));
    invalidatePeriodCache(); // hak paketlerinin günleri antrenmanlara bağlı
    return { action: "program.geriye", entity: "session", summary: `Yoklama tablosu ${formatDateTr(day.data)} tarihinden başlatıldı (${created} antrenman eklendi)` };
  });
}
