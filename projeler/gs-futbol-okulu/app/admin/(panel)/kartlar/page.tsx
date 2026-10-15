import type { Metadata } from "next";
import Link from "next/link";
import { Camera } from "lucide-react";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { listAgeGroups } from "@/lib/age-groups-db";
import { activeCardsFor } from "@/lib/cards";
import { getDb } from "@/lib/db";
import { registrations } from "@/lib/db/schema";
import { hasPhotoConsentMap } from "@/lib/legal";
import { CardsManager, type CardRow } from "./CardsManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Öğrenci Kartları" };

export default async function CardsPage() {
  await requireAdmin("kayit.duzenle");
  const regs = getDb().select().from(registrations).where(eq(registrations.status, "enrolled")).all();
  const groups = new Map(listAgeGroups().map((g) => [g.id, g.name]));
  const cards = activeCardsFor(regs.map((r) => r.id));
  const consent = hasPhotoConsentMap(regs.map((r) => r.id));
  const rows: CardRow[] = regs
    .map((r) => {
      const c = cards.get(r.id);
      return {
        id: r.id,
        name: r.studentFullName,
        studentNo: r.studentNo,
        group: r.groupId ? (groups.get(r.groupId) ?? null) : null,
        photoFileId: r.photoFileId,
        photoConsent: consent.get(r.id) ?? null,
        cardCode: c?.code ?? null,
        printedAt: c?.printedAt ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return (
    <main className="panel-rise mx-auto w-full max-w-6xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[26px]">Öğrenci Kartları</h1>
        <Link href="/admin/kartlar/foto" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-control bg-white px-3.5 text-sm font-semibold text-ink shadow-xs hover:bg-gray-50 pointer-coarse:min-h-11">
          <Camera className="h-4 w-4 text-gs-red" aria-hidden="true" /> Fotoğraf çekimi · grup grup
        </Link>
      </div>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">
        Her öğrencinin kalıcı QR kartı. QR yalnız kart kodunu taşır, kişisel bilgi içermez. Kart kaybolursa “Yeni kart” ile eskisi iptal edilir. Fotoğraf yalnız fotoğraf izni verilmişse eklenir.
      </p>
      <CardsManager rows={rows} />
    </main>
  );
}
