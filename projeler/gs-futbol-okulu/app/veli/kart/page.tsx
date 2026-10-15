import type { Metadata } from "next";
import { headers } from "next/headers";
import { Download, ScanLine, Sun } from "lucide-react";
import { listAgeGroups } from "@/lib/age-groups-db";
import { cardPath, ensureCard } from "@/lib/cards";
import { childInfoState, loadGuardian } from "@/lib/guardian-view";
import { hasPhotoConsent } from "@/lib/legal";
import { buildQrSvg } from "@/lib/qr";
import { getSiteUrl } from "@/lib/site-url";
import { ChildTabs, NoChildren } from "@/components/guardian/ChildTabs";
import { MissingInfo } from "@/components/guardian/MissingInfo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dijital kart" };

export default async function GuardianCardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { children, child } = await loadGuardian((await searchParams).ogrenci);
  if (!child) return <NoChildren />;
  const card = ensureCard(child.id, null);
  const qr = await buildQrSvg(`${getSiteUrl(await headers())}${cardPath(card.code)}`);
  const group = listAgeGroups().find((g) => g.id === child.groupId);
  const photo = child.photoFileId && hasPhotoConsent(child.id) ? child.photoFileId : null;
  return (
    <div>
      <ChildTabs kids={children} selectedId={child.id} base="/veli/kart" />
      <MissingInfo {...childInfoState(child)} modal={false} />
      <header className="veli-page-heading"><div><h1 className="veli-title">Dijital kart</h1><p>Öğrenci kartınız, her zaman yanınızda.</p></div></header>
      <div className="veli-card-layout">
        <article className="veli-digital-card" aria-label={`${child.studentFullName} öğrenci kartı`}>
          <header className="veli-digital-card-header">
            {/* eslint-disable-next-line @next/next/no-img-element -- kart ile aynı arma */}
            <img src="/home/crest.webp" alt="" width={44} height={44} />
            <div><strong className="veli-title">KÜTAHYA GALATASARAY</strong><small>Futbol Okulu · Öğrenci kartı</small></div>
          </header>
          <div className="veli-stripe" aria-hidden="true" />
          <div className="veli-digital-card-body">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- yetki kontrollü öğrenci fotoğrafı
              <img src={`/api/dosya/${photo}`} alt="" />
            ) : null}
            <h2 className="veli-title">{child.studentFullName}</h2>
            <p>{group?.name ?? "Grup bekleniyor"}</p>
            <div className="veli-qr" role="img" aria-label="Öğrenci kartı QR kodu" dangerouslySetInnerHTML={{ __html: qr }} />
            <span className="veli-label">Öğrenci no</span>
            <strong className="veli-student-number">{child.studentNo ?? "—"}</strong>
          </div>
        </article>
        <section className="veli-card-help">
          <h2 className="veli-title">Sahada bu kartı gösterin</h2>
          <p>QR kodunuz basılı öğrenci kartınızla aynıdır. Kartı telefonunuza indirip istediğiniz zaman açabilirsiniz.</p>
          <a href={`/veli/kart/indir?ogrenci=${child.id}`} download className="veli-btn veli-btn--primary"><Download size={18} aria-hidden="true" />Kartı indir</a>
          <ul>
            <li><ScanLine size={18} aria-hidden="true" /><span>QR kodun tamamı ekranda görünsün.</span></li>
            <li><Sun size={18} aria-hidden="true" /><span>Okutmadan önce ekran parlaklığını artırın.</span></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
