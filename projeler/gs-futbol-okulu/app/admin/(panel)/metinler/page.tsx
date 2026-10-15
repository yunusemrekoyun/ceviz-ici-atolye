import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/server";
import { getVersion, listLegalTexts } from "@/lib/legal";
import { TextsManager } from "./TextsManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Metinler ve Onaylar" };

export default async function TextsPage() {
  await requireAdmin("metin.yonet");
  const texts = listLegalTexts();
  // Geçmiş sürümlerin gövdeleri de gönderilir; metin sayısı az olduğundan sorun değil.
  const bodies: Record<number, string> = {};
  for (const t of texts) for (const v of t.versions) bodies[v.id] = getVersion(v.id)?.body ?? "";
  return (
    <main className="panel-rise mx-auto w-full max-w-6xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[26px]">Metinler ve Onaylar</h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">
        KVKK, açık rıza, fotoğraf izni ve okul kuralları. Değişiklikler önce taslak olarak kaydedilir; yayınlanınca yeni sürüm olur ve veliler zorunlu metinleri yeniden onaylar.
      </p>
      <TextsManager texts={texts} bodies={bodies} />
    </main>
  );
}
