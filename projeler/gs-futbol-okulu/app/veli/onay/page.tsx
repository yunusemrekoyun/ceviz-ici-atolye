import type { Metadata } from "next";
import { requirePortal } from "@/lib/auth/server";
import { guardianChildren } from "@/lib/guardians";
import { consentStatesForRegistration } from "@/lib/legal";
import { ConsentForm, type ConsentItem } from "./ConsentForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Onaylar" };

/** İlk girişte ve metin güncellenince: zorunlu metinlerin onayı + isteğe bağlı izinler (VEL-12). */
export default async function ConsentPage() {
  const user = await requirePortal("guardian");
  const children = guardianChildren(user.id);
  const items: ConsentItem[] = children.flatMap((c) =>
    consentStatesForRegistration(c.id).map((s) => ({
      registrationId: c.id,
      studentName: c.studentFullName,
      key: s.text.key,
      title: s.text.title,
      type: s.text.consentType as "required" | "optional",
      versionId: s.version.id,
      body: s.version.body,
      current: s.current,
      accepted: s.last?.accepted ?? null,
    })),
  );
  const allDone = items.every((i) => i.current && (i.type === "required" ? i.accepted === true : i.accepted !== null));
  return (
    <div className="veli-info grid gap-4">
      <header className="veli-page-heading"><div><h1 className="veli-title">Onaylar</h1>
      <p>{allDone ? "Onaylarınız kayıtlı. İsteğe bağlı izinleri buradan değiştirebilirsiniz." : "Devam etmeden önce aşağıdaki metinleri okuyup onaylayın. Metinlerin tamamı “Oku” ile açılır."}</p></div></header>
      <a href="/metin/kvkk-aydinlatma" target="_blank" rel="noopener" className="inline-flex min-h-11 items-center font-medium text-[var(--v-red)] underline underline-offset-4">
        KVKK aydınlatma metnini oku
      </a>
      <ConsentForm items={items} />
    </div>
  );
}
