import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { accessOf, latestClaim } from "@/lib/billing";
import { discountedFee, formatMoney } from "@/lib/billing-shared";
import { loadGuardian, SIMPLE_PANEL } from "@/lib/guardian-view";
import { getSettings } from "@/lib/settings";
import { NoChildren } from "@/components/guardian/ChildTabs";
import { ClaimForm } from "./ClaimForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Aidat ödemesi" };

/** Aidat ödemesi: ne kadar, sonra "bildir". IBAN sistemde yok, okul ayrıca iletir (K-02). */
export default async function ClaimPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Sade panel (VEL-17): bu sayfa şimdilik kapalı
  if (SIMPLE_PANEL) {
    const o = (await searchParams).ogrenci;
    redirect(typeof o === "string" ? `/veli?ogrenci=${encodeURIComponent(o)}` : "/veli");
  }
  const { child } = await loadGuardian((await searchParams).ogrenci);
  if (!child) return <NoChildren />;
  const access = accessOf(child);
  const amount = access.amountDueKurus || discountedFee(getSettings().feeAmountKurus, child.discountPercent);
  const pending = latestClaim(child.id)?.status === "pending";

  return (
    <div className="grid gap-4">
      <Link href={`/veli?ogrenci=${child.id}`} className="inline-flex min-h-11 items-center font-semibold text-gs-red">
        ← Geri
      </Link>
      <div>
        <h1 className="text-2xl font-black text-ink">Aidat ödemesi</h1>
        <p className="text-lg text-muted">{child.studentFullName}</p>
      </div>

      <section className="rounded-3xl bg-white p-5 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-muted">Ödenecek tutar</p>
        <p className="mt-1 text-5xl font-black tabular-nums text-ink">{formatMoney(amount)}</p>
        <p className="mt-1 text-muted">8 antrenman</p>
      </section>

      <h2 className="mt-2 text-xl font-black text-ink">Ödemeyi yaptıysanız bildirin</h2>
      {pending ? <p className="rounded-2xl bg-sky-50 p-4 text-lg font-semibold text-sky-900">Bu öğrenci için bekleyen bir bildiriminiz var. Onaylanınca haber vereceğiz.</p> : <ClaimForm registrationId={child.id} />}
    </div>
  );
}
