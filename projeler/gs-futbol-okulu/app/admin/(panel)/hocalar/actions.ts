"use server";

import { revalidatePath } from "next/cache";
import { idSchema, invalid, runAdmin, type ActionResult } from "@/lib/admin-action";
import { CoachProfileError, coachProfileSchema, MAX_COACH_PHOTO_BYTES, saveCoachProfile } from "@/lib/coach-profiles";

export async function saveCoachAction(id: number | null, form: FormData): Promise<ActionResult> {
  if (id !== null && !idSchema.safeParse(id).success) return { ok: false, error: "Geçersiz hoca profili." };
  const parsed = coachProfileSchema.safeParse({
    name: form.get("name"), role: form.get("role"), bio: form.get("bio"),
    sortOrder: Number(form.get("sortOrder")), isPublished: form.get("isPublished") === "on", isDemo: form.get("isDemo") === "on",
  });
  if (!parsed.success) return invalid(parsed.error);
  return runAdmin("ekip.yonet", "save coach profile", async () => {
    const file = form.get("photo");
    let photo: Buffer | undefined;
    if (file instanceof File && file.name) {
      if (file.size > MAX_COACH_PHOTO_BYTES) throw new CoachProfileError("Fotoğraf en fazla 10 MB olabilir.");
      photo = Buffer.from(await file.arrayBuffer());
    }
    const saved = await saveCoachProfile(id, parsed.data, photo);
    revalidatePath("/");
    return { action: id === null ? "hoca.ekle" : "hoca.duzenle", entity: "coach_profile", entityId: saved.id,
      summary: `${saved.name}: tanıtım ${id === null ? "eklendi" : "güncellendi"}; ${saved.isPublished ? "yayında" : "taslak"}` };
  }, [CoachProfileError]);
}
