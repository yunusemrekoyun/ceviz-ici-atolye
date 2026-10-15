import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/server";
import { listAgeGroups } from "@/lib/age-groups-db";
import { listAnnouncements } from "@/lib/announcements";
import { AnnouncementsManager } from "./AnnouncementsManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Duyurular" };

export default async function AnnouncementsPage() {
  await requireAdmin("duyuru.yap");
  return (
    <main className="panel-rise mx-auto w-full max-w-3xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[26px]">Duyurular</h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">Veli panelinde görünür ve velilere bildirim gider. WhatsApp grubuna atmak için hazır metni kopyalayabilirsiniz.</p>
      <AnnouncementsManager groups={listAgeGroups().map(({ id, name }) => ({ id, name }))} items={listAnnouncements({ limit: 100 })} />
    </main>
  );
}
