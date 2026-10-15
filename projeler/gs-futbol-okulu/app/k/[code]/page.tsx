import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/server";
import { ACCESS_BADGE, ACCESS_LABELS } from "@/lib/billing-shared";
import { cardByCode } from "@/lib/cards";
import { BRAND_NAME } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { registrations } from "@/lib/db/schema";
import { formatDateTr } from "@/lib/format";
import { guardianCanSee } from "@/lib/guardians";
import { formatPhone } from "@/lib/phone";
import { fieldStudent, groupScope, inScope } from "@/lib/scan";
import { getSetting } from "@/lib/settings";
import { telLink, whatsappLink } from "@/lib/whatsapp";
import { CardMarkButton } from "./CardMarkButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Öğrenci Kartı", robots: { index: false, follow: false } };

/**
 * Kartın QR adresi. Bu yol kalıcıdır. Okutana göre görünüm değişir:
 * giriş yok → yalnız okul bilgisi; veli → kendi çocuğu; antrenör → saha görünümü (kendi grubu); yönetici → saha görünümü + profil.
 */
export default async function CardPage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code;
  const card = cardByCode(code);
  const user = await getCurrentUser();
  const phone = getSetting("contactPhone");

  if (card && card.status === "active" && user) {
    const reg = getDb().select().from(registrations).where(eq(registrations.id, card.registrationId)).get();
    if (reg && user.portal === "guardian" && guardianCanSee(user.id, reg.id)) redirect(`/veli?ogrenci=${reg.id}`);
    if (reg && (user.portal === "admin" || user.portal === "coach") && inScope(groupScope(user), reg.groupId)) {
      const s = fieldStudent(reg);
      const canMark = user.permissions.includes("yoklama.al") && reg.status === "enrolled";
      return (
        <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
          <div className={["rounded-3xl border-4 bg-white p-5 shadow-sm", s.allowed ? "border-emerald-500" : "border-red-500"].join(" ")}>
            <div className="flex items-start gap-4">
              {s.photoFileId ? (
                // eslint-disable-next-line @next/next/no-img-element -- yetki kontrollü dosya adresi
                <img src={`/api/dosya/${s.photoFileId}`} alt="" className="h-28 w-22 shrink-0 rounded-xl object-cover" />
              ) : null}
              <div className="min-w-0">
                <h1 className="text-2xl font-black text-ink">{s.name}</h1>
                <p className="text-muted">
                  No {s.studentNo ?? "—"} · {s.groupName ?? "Grupsuz"}
                </p>
                <span className={`mt-2 inline-block rounded-lg px-2.5 py-1 text-sm font-bold ${ACCESS_BADGE[s.access]}`}>{reg.status === "enrolled" ? ACCESS_LABELS[s.access] : "Kaydı aktif değil"}</span>
              </div>
            </div>
            {!s.allowed && reg.status === "enrolled" ? <p className="mt-4 rounded-xl bg-red-50 p-3 font-bold text-red-800">Aidat ödenmemiş. Antrenmana alınamaz.</p> : null}
            {canMark && s.allowed ? <CardMarkButton code={card.code} /> : null}
            <dl className="mt-5 grid gap-2 text-[15px]">
              <div>
                <dt className="text-xs font-semibold uppercase text-muted">Doğum tarihi</dt>
                <dd className="text-ink">{formatDateTr(s.birthDate) || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-muted">Kan grubu</dt>
                <dd className="text-ink">{s.bloodGroup || "—"}</dd>
              </div>
              {s.contactPhone ? (
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted">Veli</dt>
                  <dd className="text-ink">
                    {s.contactName} ·{" "}
                    <a href={telLink(s.contactPhone)} className="font-semibold text-gs-red">
                      {formatPhone(s.contactPhone)}
                    </a>
                  </dd>
                </div>
              ) : null}
              {s.emergencyPhone ? (
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted">Acil durum</dt>
                  <dd className="text-ink">
                    {s.emergencyName} ({s.emergencyRelation}) ·{" "}
                    <a href={telLink(s.emergencyPhone)} className="font-semibold text-gs-red">
                      {formatPhone(s.emergencyPhone)}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
            {user.portal === "admin" && user.permissions.includes("kayit.gor") ? (
              <Link href={`/admin/kayit/${reg.id}`} className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-line px-4 font-semibold text-ink hover:bg-surface">
                Tam profil →
              </Link>
            ) : null}
          </div>
        </main>
      );
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-12 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gs-red">Öğrenci Kartı</p>
      <h1 className="mt-2 text-2xl font-black text-ink">{BRAND_NAME}</h1>
      {card && card.status === "active" ? (
        <p className="mt-4 text-[17px] text-ink">Bu kart okulumuzun öğrencisine aittir. Kartı bulduysanız lütfen bize ulaşın.</p>
      ) : (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-[17px] font-semibold text-red-800">{card ? "Bu kart iptal edilmiştir." : "Kart bulunamadı."}</p>
      )}
      <div className="mt-6 grid w-full gap-3">
        <a href={telLink(phone)} className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-gs-red text-lg font-bold text-white">
          Ara · {formatPhone(phone)}
        </a>
        <a href={whatsappLink(phone, "Merhaba, bir öğrenci kartı buldum.")} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-14 items-center justify-center rounded-2xl border-2 border-emerald-600 text-lg font-bold text-emerald-800">
          WhatsApp
        </a>
        <Link href="/giris" className="mt-2 text-sm font-semibold text-muted hover:text-ink">
          Veli / antrenör girişi
        </Link>
      </div>
    </main>
  );
}
