"use server";

import { z } from "zod";
import { idSchema, invalid, runAdmin, type ActionResult } from "@/lib/admin-action";
import { createAnnouncement, deleteAnnouncement } from "@/lib/announcements";
import { notifyGuardiansOfGroups } from "@/lib/guardian-notify";

const schema = z.object({
  title: z.string().trim().min(3, { error: "Başlık yazın." }).max(120),
  body: z.string().trim().min(3, { error: "Duyuru metnini yazın." }).max(3000),
  groupIds: z.array(idSchema).max(50),
});

export async function createAnnouncementAction(values: { title: string; body: string; groupIds: number[] }): Promise<ActionResult & { notified?: number }> {
  const parsed = schema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error);
  let notified = 0;
  const res = await runAdmin("duyuru.yap", "create announcement", (actor) => {
    const a = createAnnouncement({ ...parsed.data, userId: actor.id });
    notified = notifyGuardiansOfGroups(parsed.data.groupIds.length ? parsed.data.groupIds : null, { kind: "duyuru", title: a.title, body: a.body.slice(0, 200), link: "/veli" });
    return { action: "duyuru.ekle", entity: "announcement", entityId: a.id, summary: `${a.title} (${parsed.data.groupIds.length ? `${parsed.data.groupIds.length} grup` : "tüm veliler"}, ${notified} veliye bildirim)` };
  });
  return res.ok ? { ...res, notified } : res;
}

export async function deleteAnnouncementAction(id: number): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz duyuru." };
  return runAdmin("duyuru.yap", "delete announcement", () => {
    deleteAnnouncement(id);
    return { action: "duyuru.sil", entity: "announcement", entityId: id, summary: "Duyuru silindi" };
  });
}
