import type { Metadata } from "next";
import { headers } from "next/headers";
import { HomePage } from "@/components/home/HomePage";
import { BRAND_NAME } from "@/lib/constants";
import { loadHomeData } from "@/lib/home-data";
import { buildQrSvg } from "@/lib/qr";
import { getPublicFormUrl, getSiteUrl } from "@/lib/site-url";
import { loadPublishedCoaches } from "@/lib/coach-profiles";
import { getSetting } from "@/lib/settings";

// Gruplar, program ve sıradaki antrenmanlar panelden canlı okunur.
export const dynamic = "force-dynamic";

const description =
  "Kütahya'da çocuklar için futbol okulu. Doğum yılına göre gruplar, antrenman günleri ve saha bilgisi; online ön kayıt.";

export const metadata: Metadata = {
  // Paylaşım görselinin tam adresi için (WhatsApp önizlemesi)
  metadataBase: new URL(getSiteUrl()),
  title: { absolute: BRAND_NAME },
  description,
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: BRAND_NAME,
    title: BRAND_NAME,
    description,
  },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const h = await headers();
  const { yil } = await searchParams;
  const data = loadHomeData();
  const qrSvg = await buildQrSvg(getPublicFormUrl(h));
  const initialYear =
    typeof yil === "string" && /^\d{4}$/.test(yil) ? Number(yil) : null;
  return <HomePage data={data} qrSvg={qrSvg} initialYear={initialYear} coaches={loadPublishedCoaches()} phone={getSetting("contactPhone")} />;
}
