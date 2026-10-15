import type { Metadata } from "next";
import Link from "next/link";
import { toRegistrationDto } from "@/lib/api";
import { issuesOf } from "@/lib/data-issues";
import { loadGuardian } from "@/lib/guardian-view";
import { pendingInfoAt } from "@/lib/guardian-info";
import { registrationToFormValues } from "@/lib/registrations-client";
import { validateRegistration, type FieldErrors } from "@/lib/validation";
import { ChildTabs, NoChildren } from "@/components/guardian/ChildTabs";
import { InfoForm } from "./InfoForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bilgileri tamamla" };

const FIX_MESSAGE: Record<string, string> = { tc: "Numara hatalı görünüyor, kontrol edin.", phone: "Numara hatalı görünüyor, kontrol edin.", birth: "Tarih hatalı görünüyor, kontrol edin." };

/** Eksik ya da hatalı bilgileri tamamlama: kayıt doğrudan değişmez, okulun onayına gider. */
export default async function GuardianInfoPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { children, child } = await loadGuardian((await searchParams).ogrenci);
  if (!child) return <NoChildren />;
  const values = registrationToFormValues(child);
  // Açılışta eksik (zorunlu boş) ve hatalı görünen alanlar işaretli gelir
  const check = validateRegistration(values);
  const errors: FieldErrors = check.success ? {} : { ...check.errors };
  for (const issue of issuesOf(toRegistrationDto(child)))
    if (issue.fix.kind === "field" && FIX_MESSAGE[issue.type] && !errors[issue.fix.field]) errors[issue.fix.field] = FIX_MESSAGE[issue.type];
  const pending = pendingInfoAt(child.id);
  const back = `/veli?ogrenci=${child.id}`;
  return (
    <div className="veli-info">
      <ChildTabs kids={children} selectedId={child.id} base="/veli/bilgiler" />
      <Link href={back} className="mb-2 inline-flex min-h-11 items-center gap-1 text-[15px] font-medium text-[var(--v-red)]">
        ← Profil
      </Link>
      <header className="veli-page-heading"><div><h1 className="veli-title">Bilgileri tamamla</h1>
      <p>
        {child.studentFullName} · kırmızı işaretli alanları doldurun ya da düzeltin. Diğer bilgileri de güncelleyebilirsiniz.
      </p></div></header>
      {pending ? <p className="veli-notice">Daha önce gönderdiğiniz bilgiler okulun onayını bekliyor. Yeniden gönderirseniz en son gönderdiğiniz geçerli olur.</p> : null}
      <InfoForm registrationId={child.id} initialValues={values} initialErrors={errors} backHref={back} />
    </div>
  );
}
