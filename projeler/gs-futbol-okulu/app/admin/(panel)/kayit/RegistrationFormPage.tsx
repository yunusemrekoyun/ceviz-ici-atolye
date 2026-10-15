"use client";

import { useRouter } from "next/navigation";
import { Page, PageHeader } from "@/components/admin/kit";
import { useToast } from "@/components/admin/Toast";
import type { RegistrationDto } from "@/lib/api";
import type { FieldErrors, RegistrationField } from "@/lib/registration-fields";
import { EditRegistrationForm } from "../EditRegistrationForm";

/** Yeni kayıt ya da bilgileri düzenleme: uzun form tam sayfada. */
export function RegistrationFormPage({ reg, hiddenSensitive, focusField, initialErrors }: { reg: RegistrationDto | null; hiddenSensitive?: boolean; focusField?: RegistrationField | null; initialErrors?: FieldErrors }) {
  const router = useRouter();
  const toast = useToast();
  const back = reg ? `/admin/kayit/${reg.id}` : "/admin/on-kayitlar";
  return (
    <Page width="narrow">
      <PageHeader
        back={{ href: back, label: reg ? reg.studentFullName : "Başvurular" }}
        title={reg ? "Bilgileri düzenle" : "Yeni kayıt"}
        description={
          reg
            ? "Bilinmeyen alanları boş bırakabilirsiniz; kayıt “eksik bilgi” olarak görünür."
            : "Sahada gelen ya da telefonla ulaşan veli için. Yalnız öğrenci adı zorunlu; bilinmeyenleri boş bırakın, sonra tamamlanır."
        }
      />
      {hiddenSensitive ? <p className="mb-4 rounded-xl bg-surface px-4 py-3 text-sm text-muted">T.C., adres ve kan grubu size gizli. Boş görünseler de kaydedince silinmez.</p> : null}
      <EditRegistrationForm
        reg={reg}
        focusField={focusField}
        initialErrors={initialErrors}
        onCancel={() => router.push(back)}
        onSaved={(saved, intent) => {
          toast({ text: reg ? "Bilgiler güncellendi." : `${saved.studentFullName} eklendi.` });
          router.push(!reg && intent === "enroll" ? `/admin/kayit/${saved.id}/asil-kayit` : `/admin/kayit/${saved.id}`);
          router.refresh();
        }}
      />
    </Page>
  );
}
