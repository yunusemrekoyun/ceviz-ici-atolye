import type { Metadata } from "next";
import { headers } from "next/headers";
import { inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/server";
import { listAgeGroups } from "@/lib/age-groups-db";
import { cardPath, ensureCard } from "@/lib/cards";
import { BRAND_NAME } from "@/lib/constants";
import { formatPhone } from "@/lib/phone";
import { getSetting } from "@/lib/settings";
import { getDb } from "@/lib/db";
import { registrations } from "@/lib/db/schema";
import { hasPhotoConsentMap } from "@/lib/legal";
import { buildQrSvg } from "@/lib/qr";
import { getSiteUrl } from "@/lib/site-url";
import { PrintCardsButton } from "./PrintCardsButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Kart Baskısı" };

/** Kredi kartı ölçüsü (CR80, 85,6 × 54 mm); A4'e 2 × 5 dizilir, kesim çizgileri kesikli. */
export default async function CardPrintPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdmin("kayit.duzenle");
  const raw = (await searchParams).ids;
  const ids = (typeof raw === "string" ? raw.split(",") : []).map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 200);
  const regs = ids.length ? getDb().select().from(registrations).where(inArray(registrations.id, ids)).all().filter((r) => r.status === "enrolled") : [];
  const groups = new Map(listAgeGroups().map((g) => [g.id, g.name]));
  const consent = hasPhotoConsentMap(regs.map((r) => r.id));
  const base = getSiteUrl(await headers());
  const phone = formatPhone(getSetting("contactPhone"));
  const cards = await Promise.all(
    regs
      .sort((a, b) => a.studentFullName.localeCompare(b.studentFullName, "tr"))
      .map(async (r) => {
        const card = ensureCard(r.id, admin.id);
        return { reg: r, card, qr: await buildQrSvg(`${base}${cardPath(card.code)}`) };
      }),
  );
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 print:p-0">
      <style>{`
        @page { size: A4; margin: 7mm; }
        .card-sheet { display: grid; grid-template-columns: repeat(2, 85.6mm); gap: 3mm; justify-content: center; }
        .id-card { width: 85.6mm; height: 54mm; break-inside: avoid; }
        .id-card svg { width: 100%; height: 100%; }
        @media print { .card-sheet { gap: 3mm; } }
      `}</style>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{cards.length} kart · A4, %100 ölçekle yazdırın (“sayfaya sığdır” kapalı).</p>
        <PrintCardsButton cardIds={cards.map((c) => c.card.id)} />
      </div>
      {cards.length === 0 ? <p className="text-center text-muted">Seçili öğrenci yok.</p> : null}
      <div className="card-sheet">
        {cards.map(({ reg, card, qr }) => (
          <article key={card.id} className="id-card relative flex flex-col overflow-hidden rounded-[3mm] border border-dashed border-gray-400 bg-white text-ink">
            <header className="flex h-[10mm] items-center gap-[2mm] bg-gs-red px-[3mm] text-white">
              <span className="text-[7.5pt] font-black uppercase leading-tight tracking-wide">{BRAND_NAME}</span>
            </header>
            <div className="h-[1.2mm] bg-gs-yellow" />
            <div className="flex flex-1 gap-[2.5mm] px-[3mm] py-[2mm]">
              {reg.photoFileId && consent.get(reg.id) ? (
                // eslint-disable-next-line @next/next/no-img-element -- yetki kontrollü dosya adresi
                <img src={`/api/dosya/${reg.photoFileId}`} alt="" className="h-[27mm] w-[21mm] shrink-0 rounded-[1.5mm] object-cover" />
              ) : (
                <span className="flex h-[27mm] w-[21mm] shrink-0 items-center justify-center rounded-[1.5mm] bg-gs-red-soft text-[16pt] font-black text-gs-red">{reg.studentFullName.slice(0, 1)}</span>
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-[9.5pt] font-black leading-tight">{reg.studentFullName}</p>
                <p className="mt-[1mm] text-[7pt] text-muted">{reg.groupId ? groups.get(reg.groupId) : ""}</p>
                <p className="mt-auto text-[6pt] uppercase tracking-wide text-muted">Öğrenci no</p>
                <p className="font-mono text-[15pt] font-black leading-none">{reg.studentNo ?? "—"}</p>
              </div>
              <div className="flex w-[24mm] shrink-0 flex-col items-center">
                <div className="h-[24mm] w-[24mm]" dangerouslySetInnerHTML={{ __html: qr }} />
                <p className="mt-[0.5mm] font-mono text-[6pt] tracking-widest">{card.code}</p>
              </div>
            </div>
            <footer className="px-[3mm] pb-[1.5mm] text-[5.5pt] text-muted">Bulunursa lütfen arayın: {phone}</footer>
          </article>
        ))}
      </div>
    </main>
  );
}
