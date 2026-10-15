import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/server";
import { listAgeGroups } from "@/lib/age-groups-db";
import { guardianOverview } from "@/lib/guardians";
import { isMailConfigured } from "@/lib/mail";
import { GuardiansManager } from "./GuardiansManager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Veli Hesapları" };

export default async function GuardiansPage() {
  await requireAdmin("veli.yonet");
  const groups = Object.fromEntries(listAgeGroups().map((g) => [g.id, g.name]));
  return (
    <main className="panel-rise mx-auto w-full max-w-5xl px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pt-7">
      <h1 className="text-[22px] font-bold leading-tight tracking-[-0.015em] text-ink sm:text-[26px]">Veli Hesapları</h1>
      <p className="mt-1 max-w-2xl text-[15px] text-muted">
        Veliler öğrenci numarası ve kendi belirledikleri şifreyle girer. “Davet gönder” tek kullanımlık bir bağlantı üretir; WhatsApp ile gönderin. Kardeşler aynı telefon numarasıyla tek hesapta toplanır.
        {isMailConfigured() ? "" : " E-posta ayarlı olmadığı için şifre sıfırlama da buradan yapılır."}
      </p>
      <GuardiansManager rows={guardianOverview()} groups={groups} />
    </main>
  );
}
