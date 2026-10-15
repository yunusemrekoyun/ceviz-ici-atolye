import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { todayKey } from "@/lib/billing";
import { dayLabel, formatMoney, PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/billing-shared";
import { formatDateTr, resolveContactParent } from "@/lib/format";
import { childSummary } from "@/lib/guardian-summary";
import { loadGuardian, SIMPLE_PANEL } from "@/lib/guardian-view";
import { hasPhotoConsent } from "@/lib/legal";
import { directionLinks } from "@/lib/maps";
import { formatPhone } from "@/lib/phone";
import { getSetting } from "@/lib/settings";
import { ChildTabs, NoChildren } from "@/components/guardian/ChildTabs";
import { ContactSchool } from "@/components/guardian/ContactSchool";
import { Card, ChildHeader, FeeCard, MoreLink } from "@/components/guardian/Summary";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profil" };

/** Öğrenci profili: programı, aidat ve ödemeleri, forması, kayıtlı bilgileri ve onayları tek sayfada. Kilitli çocukta açılmaz (K-03). */
export default async function GuardianProfile({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Sade panel (VEL-17): bu sayfa şimdilik kapalı
  if (SIMPLE_PANEL) {
    const o = (await searchParams).ogrenci;
    redirect(typeof o === "string" ? `/veli?ogrenci=${encodeURIComponent(o)}` : "/veli");
  }
  const { children, child } = await loadGuardian((await searchParams).ogrenci, { requireAccess: true });
  if (!child) return <NoChildren />;
  const today = todayKey();
  const s = childSummary(child, today);
  const contact = resolveContactParent(child);
  const other =
    child.contactParentType === "baba" ? { name: child.motherFullName, phone: child.motherPhone, label: "Anne" } : child.contactParentType === "anne" ? { name: child.fatherFullName, phone: child.fatherPhone, label: "Baba" } : null;
  const consentsOk = s.consents.filter((c) => c.required).every((c) => c.ok);

  return (
    <div className="grid gap-4">
      <ChildTabs kids={children} selectedId={child.id} base="/veli/profil" />
      <ChildHeader s={s} photo={hasPhotoConsent(child.id)} />

      <Link href={`/veli/kart?ogrenci=${child.id}`} className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-ink text-lg font-bold text-white active:scale-[0.99]">
        Öğrenci kartını göster
      </Link>

      <Card title="Antrenman günleri" action={<MoreLink href={`/veli/takvim?ogrenci=${child.id}`}>Program</MoreLink>}>
        {s.group ? (
          <p className="text-[15px] text-muted">
            {s.group.name} · {s.group.years} doğumlular ({s.group.ages} yaş)
          </p>
        ) : null}
        {s.slots.length ? (
          <ul className="mt-2 grid gap-1.5">
            {s.slots.map((sl, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 rounded-2xl bg-surface px-4 py-3">
                <span className="text-lg font-bold text-ink">{sl.day}</span>
                <span className="text-lg tabular-nums text-ink">
                  {sl.startTime}–{sl.endTime}
                </span>
                {sl.venue ? <span className="w-full text-[15px] text-muted">{sl.venue}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-lg text-muted">Antrenman günleri henüz belirlenmedi.</p>
        )}
        {s.coaches.length ? (
          <p className="mt-3 text-[16px] text-ink">
            Antrenör: <span className="font-bold">{s.coaches.join(", ")}</span>
          </p>
        ) : null}
        {s.venue ? (
          <a href={directionLinks(s.venue)[0]!.href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-2xl border-2 border-line text-[17px] font-bold text-ink">
            {s.venue.name} · yol tarifi
          </a>
        ) : null}
      </Card>

      <FeeCard s={s} today={today} />

      <Card title="Ödemeler">
        {s.payments.length === 0 ? (
          <p className="text-lg text-muted">Henüz ödeme kaydı yok.</p>
        ) : (
          <ul className="divide-y divide-line">
            {s.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <span className="min-w-0">
                  <span className="block text-[17px] font-bold text-ink">{dayLabel(p.paidOn)}</span>
                  <span className="block text-sm text-muted">
                    {PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method} · {p.sessions} antrenman · makbuz {p.receiptNo}
                  </span>
                </span>
                <span className="shrink-0 text-lg font-black tabular-nums text-ink">{formatMoney(p.amountKurus)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-sm text-muted">Bir aidat {formatMoney(s.fee)}, 8 antrenman hakkı verir.</p>
      </Card>

      <Card title="Forma ve malzeme">
        {s.kit.length === 0 ? (
          <p className="text-lg text-muted">Forma kaydı yok. Forma için okulla görüşebilirsiniz.</p>
        ) : (
          <ul className="grid gap-2">
            {s.kit.map((k, i) => (
              <li key={i} className="grid gap-1.5 rounded-2xl bg-surface px-4 py-3">
                <span className="text-[17px] font-bold text-ink">
                  {k.name}
                  {k.size ? <span className="block text-sm font-normal text-muted">Beden {k.size}</span> : null}
                </span>
                <KitState text={k.text} tone={k.tone} />
                {k.sock ? (
                  <span className="grid gap-1 border-t border-line pt-1.5">
                    <span className="text-sm text-muted">Tozluk{k.sock.size ? ` · numara ${k.sock.size}` : ""}</span>
                    <KitState text={k.sock.text} tone={k.sock.tone} />
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Kayıtlı bilgiler">
        <dl className="grid gap-3 text-[16px]">
          <Fact label="Doğum tarihi" value={child.birthDate ? formatDateTr(child.birthDate) : "—"} />
          <Fact label={`İletişim velisi (${contact.typeLabel})`} value={[contact.fullName, contact.phone ? formatPhone(contact.phone) : null].filter(Boolean).join(" · ") || "—"} />
          {other && (other.name || other.phone) ? <Fact label={other.label} value={[other.name, other.phone ? formatPhone(other.phone) : null].filter(Boolean).join(" · ")} /> : null}
          <Fact
            label="Acil durumda aranacak"
            value={[[child.emergencyFullName, child.emergencyRelation ? `(${child.emergencyRelation})` : null].filter(Boolean).join(" "), child.emergencyPhone ? formatPhone(child.emergencyPhone) : null].filter(Boolean).join(" · ") || "—"}
          />
          <Fact label="Kan grubu" value={child.bloodGroup || "—"} />
        </dl>
        <p className="mt-4 text-[15px] text-muted">Bilgilerde değişiklik varsa okula yazın, biz güncelleyelim.</p>
        <div className="mt-2">
          <ContactSchool phone={getSetting("contactPhone")} message={`Merhaba, ${child.studentFullName} (No ${child.studentNo ?? "-"}) için kayıtlı bilgilerde değişiklik var: `} />
        </div>
      </Card>

      <Card title="Onaylar" action={<MoreLink href="/veli/onay">{consentsOk ? "Gör" : "Onayla"}</MoreLink>}>
        <ul className="grid gap-2">
          {s.consents.map((c) => (
            <li key={c.title} className="flex items-center justify-between gap-3">
              <span className="text-[16px] text-ink">{c.title}</span>
              <span className={["shrink-0 rounded-xl px-2.5 py-1 text-sm font-bold", c.ok ? "bg-emerald-100 text-emerald-900" : c.required ? "bg-amber-100 text-amber-900" : "bg-stone-100 text-stone-700"].join(" ")}>
                {c.ok ? "Onaylandı" : c.required ? "Onay bekleniyor" : "İsteğe bağlı"}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}

function KitState({ text, tone }: { text: string; tone: "good" | "warn" | "neutral" }) {
  return (
    <span className={["justify-self-start rounded-xl px-2.5 py-1 text-sm font-bold", tone === "good" ? "bg-emerald-100 text-emerald-900" : tone === "warn" ? "bg-amber-100 text-amber-900" : "bg-white text-ink"].join(" ")}>
      {text.charAt(0).toLocaleUpperCase("tr-TR") + text.slice(1)}
    </span>
  );
}
