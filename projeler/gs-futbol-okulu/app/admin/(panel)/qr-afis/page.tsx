import { headers } from "next/headers";
import { requireAdmin } from "@/lib/auth/server";
import { FORM_TITLE, SCHOOL_NAME_LINE_1, SCHOOL_NAME_LINE_2 } from "@/lib/constants";
import { getPublicFormUrl } from "@/lib/site-url";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

/** A4'e yazdırılabilir QR afişi (tarayıcıdan Yazdır / PDF olarak kaydet). */
export default async function QrPosterPage() {
  await requireAdmin("kayit.gor");
  const url = getPublicFormUrl(await headers());
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-6 py-10 text-center print:py-4">
      <div className="no-print mb-6 flex w-full justify-end">
        <PrintButton />
      </div>
      <div className="w-full rounded-3xl border-4 border-gs-red bg-white p-8 sm:p-12 print:border-4">
        <p className="text-lg font-bold uppercase tracking-[0.2em] text-gs-red">{SCHOOL_NAME_LINE_1}</p>
        <h1 className="mt-1 text-3xl font-extrabold uppercase tracking-wide text-ink">{SCHOOL_NAME_LINE_2}</h1>
        <p className="mt-2 text-xl font-semibold uppercase tracking-wider text-gs-red">{FORM_TITLE}</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- dinamik PNG, optimizasyon gerekmiyor */}
        <img src="/api/admin/qr" alt="Ön kayıt formu QR kodu" className="mx-auto mt-8 w-full max-w-sm" />
        <p className="mt-8 text-2xl font-bold text-ink">
          Telefonunuzun kamerasıyla okutarak ön kayıt formuna ulaşabilirsiniz.
        </p>
        <p className="mt-6 break-all font-mono text-sm text-muted">{url}</p>
      </div>
    </main>
  );
}
