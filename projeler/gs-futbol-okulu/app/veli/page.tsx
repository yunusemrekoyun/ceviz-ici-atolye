import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Phone } from "lucide-react";
import { todayKey } from "@/lib/billing";
import { dayLabel } from "@/lib/billing-shared";
import { childSummary } from "@/lib/guardian-summary";
import { childInfoState, loadGuardian } from "@/lib/guardian-view";
import { computeAge, formatDateTr, istanbulDayKey, resolveContactParent } from "@/lib/format";
import { hasPhotoConsent } from "@/lib/legal";
import { formatPhone } from "@/lib/phone";
import { getSetting } from "@/lib/settings";
import { telLink, whatsappLink } from "@/lib/whatsapp";
import { ChildTabs, NoChildren } from "@/components/guardian/ChildTabs";
import { InstallApp } from "@/components/guardian/InstallApp";
import { MissingInfo } from "@/components/guardian/MissingInfo";
import { NextTraining } from "@/components/guardian/NextTraining";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profil" };

export default async function GuardianProfile({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { children, child } = await loadGuardian((await searchParams).ogrenci);
  if (!child) return <NoChildren />;
  const today = todayKey();
  const s = childSummary(child, today);
  const info = childInfoState(child);
  const photo = child.photoFileId && hasPhotoConsent(child.id) ? child.photoFileId : null;
  const contact = resolveContactParent(child);
  const age = child.birthDate ? computeAge(child.birthDate) : null;
  const phone = getSetting("contactPhone");
  const missing = (v: string | null | undefined) => (v && v.trim() ? v : null);
  const person = (name: string | null, tel: string | null) => (missing(name) ? [name, tel ? formatPhone(tel) : null].filter(Boolean).join(" · ") : null);

  return (
    <div>
      <ChildTabs kids={children} selectedId={child.id} base="/veli" />
      <MissingInfo {...info} />
      <header className="veli-student">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- yetki kontrollü öğrenci fotoğrafı
          <img src={`/api/dosya/${photo}`} alt="" className="veli-avatar" />
        ) : <span className="veli-avatar" aria-hidden="true">{initials(child.studentFullName)}</span>}
        <div className="veli-student-copy">
          <p className="veli-label">Öğrenci profili</p>
          <h1 className="veli-title">{child.studentFullName}</h1>
          <div className="veli-student-meta">
            {age !== null ? <span>{age} yaş</span> : null}
            {child.studentNo ? <span>Öğrenci no {child.studentNo}</span> : null}
            {child.enrolledAt ? <span>Kayıt: {dayLabel(istanbulDayKey(child.enrolledAt))}</span> : null}
          </div>
        </div>
      </header>

      <div className="veli-profile-layout">
        <aside aria-label="Grup ve antrenman bilgileri">
          <section className="veli-group">
            <span>Antrenman grubu</span>
            <h2 className="veli-title">{s.group?.name ?? "Grup bekleniyor"}</h2>
            {s.group ? (
              <>
                <p>{s.group.years} doğumlular · {s.group.ages} yaş</p>
                {s.slots.length ? (
                  <ul className="veli-schedule">
                    {s.slots.map((slot, i) => (
                      <li key={i}><span>{slot.day}</span><span>{slot.startTime}-{slot.endTime}{slot.venue ? <small>{slot.venue}</small> : null}</span></li>
                    ))}
                  </ul>
                ) : <p className="mt-4">Antrenman günleri yakında paylaşılacak.</p>}
              </>
            ) : <p>Grup ataması yapılınca gün ve saatler burada görünecek.</p>}
          </section>
          <NextTraining next={s.next} today={today} />
          <section className="veli-contact" aria-label="Okulla iletişim">
            <h2 className="veli-title">Okulla iletişim</h2>
            <div className="veli-contact-actions">
              <a href={telLink(phone)} className="veli-btn veli-btn--line"><Phone size={16} aria-hidden="true" />Okulu ara</a>
              <a href={whatsappLink(phone, `Merhaba, ${child.studentFullName} hakkında yazıyorum.`)} target="_blank" rel="noopener noreferrer" className="veli-btn veli-btn--primary">WhatsApp<ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
            <p>{formatPhone(phone)}</p>
          </section>
        </aside>

        <div>
          <section className="veli-details-section" aria-labelledby="ogrenci-bilgileri">
            <h2 id="ogrenci-bilgileri" className="veli-title">Öğrenci bilgileri</h2>
            <dl className="veli-facts">
              <Fact label="Doğum tarihi" value={child.birthDate ? `${formatDateTr(child.birthDate)}${age !== null ? ` · ${age} yaş` : ""}` : null} />
              <Fact label="T.C. Kimlik No" value={child.studentTc ? maskTc(child.studentTc) : null} />
              <Fact label="Kan grubu" value={missing(child.bloodGroup)} />
              <Fact label="Öğrenci no" value={child.studentNo ? String(child.studentNo) : "—"} />
              <Fact label="Ev adresi" value={missing(child.homeAddress)} wide />
            </dl>
          </section>
          <section className="veli-details-section" aria-labelledby="aile-bilgileri">
            <h2 id="aile-bilgileri" className="veli-title">Aile bilgileri</h2>
            <dl className="veli-facts">
              <Fact label={`İletişim velisi (${contact.typeLabel})`} value={person(contact.fullName, contact.phone)} wide />
              <Fact label="Anne" value={person(child.motherFullName, child.motherPhone)} optional />
              <Fact label="Baba" value={person(child.fatherFullName, child.fatherPhone)} optional />
              <Fact label="Acil durumda aranacak" value={missing(child.emergencyFullName) ? `${child.emergencyFullName}${child.emergencyRelation ? ` (${child.emergencyRelation})` : ""}${child.emergencyPhone ? ` · ${formatPhone(child.emergencyPhone)}` : ""}` : null} wide />
            </dl>
            <Link href={info.href} className="veli-btn veli-btn--line mt-6">Bilgileri güncelle<ArrowUpRight size={16} aria-hidden="true" /></Link>
          </section>
          <InstallApp />
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value, optional = false, wide = false }: { label: string; value: string | null; optional?: boolean; wide?: boolean }) {
  return (
    <div className={`veli-fact${wide ? " veli-fact--wide" : ""}`}>
      <dt>{label}</dt>
      <dd>{value ?? (optional ? "—" : <span className="font-medium text-[var(--v-red)]">Eksik</span>)}</dd>
    </div>
  );
}

function maskTc(tc: string): string { return tc.length > 4 ? `${tc.slice(0, 3)}••••••${tc.slice(-2)}` : tc; }
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toLocaleUpperCase("tr-TR");
}
