import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/server";
import { listCallbackRequests } from "@/lib/callbacks";
import { CandidateTabs } from "@/components/admin/SectionTabs";
import { CallbackList } from "./CallbackList";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Arama Talepleri" };

export default async function CallbacksPage() {
  await requireAdmin("kayit.gor");
  return (
    <main className="panel-rise mx-auto w-full max-w-5xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <CandidateTabs active="callbacks" />
      <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[26px]">Arama Talepleri</h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">Sitedeki &quot;Sizi Arayalım&quot; formundan gelenler. Aradıktan sonra &quot;Arandı&quot; deyin.</p>
      <CallbackList requests={listCallbackRequests()} />
    </main>
  );
}
