import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/server";
import { listCoachProfiles } from "@/lib/coach-profiles";
import { CoachManager } from "./CoachManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hoca Tanıtımları" };

export default async function CoachesPage() {
  await requireAdmin("ekip.yonet");
  return (
    <main className="panel-rise mx-auto w-full max-w-5xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[26px]">Hoca Tanıtımları</h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">Ana sayfadaki fotoğraflar ve kısa tanıtımlar. Sıra numarası küçük olan önce görünür; taslak profiller ana sayfada gösterilmez.</p>
      <CoachManager profiles={listCoachProfiles()} />
    </main>
  );
}
