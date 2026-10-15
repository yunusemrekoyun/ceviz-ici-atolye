"use server";

import { z } from "zod";
import { idSchema, invalid, runAdmin, type ActionResult } from "@/lib/admin-action";
import { DevelopmentError, drillSchema, saveDrill, saveTest, setDrillActive, setTestActive, testSchema } from "@/lib/development";

const run = (scope: string, fn: Parameters<typeof runAdmin>[2]) => runAdmin("program.yonet", scope, fn, [DevelopmentError]);

export type TestFormValues = { name: string; unit: string; higherBetter: boolean; decimals: string; groupIds: number[]; description: string };
export type DrillFormValues = { name: string; category: string; description: string };

export async function saveTestAction(id: number | null, values: TestFormValues): Promise<ActionResult> {
  if (id !== null && !idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz test." };
  const parsed = testSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  return run("save test", () => {
    const t = saveTest(id, parsed.data);
    return { action: id ? "test.duzenle" : "test.ekle", entity: "test", entityId: t.id, summary: `Test: ${t.name} (${t.unit})` };
  });
}

export async function setTestActiveAction(id: number, active: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success || !z.boolean().safeParse(active).success) return { ok: false, error: "Geçersiz istek." };
  return run("test active", () => {
    setTestActive(id, active);
    return { action: "test.durum", entity: "test", entityId: id, summary: active ? "Test etkin" : "Test kullanım dışı" };
  });
}

export async function saveDrillAction(id: number | null, values: DrillFormValues): Promise<ActionResult> {
  if (id !== null && !idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz drill." };
  const parsed = drillSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  return run("save drill", () => {
    const d = saveDrill(id, parsed.data);
    return { action: id ? "drill.duzenle" : "drill.ekle", entity: "drill", entityId: d.id, summary: `Drill: ${d.name}` };
  });
}

export async function setDrillActiveAction(id: number, active: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz istek." };
  return run("drill active", () => {
    setDrillActive(id, active);
    return { action: "drill.durum", entity: "drill", entityId: id, summary: active ? "Drill etkin" : "Drill kullanım dışı" };
  });
}
