import Link from "next/link";
import { UserX } from "lucide-react";
import { getSystemSettings } from "@/lib/settings";
import { KayitForm } from "./KayitForm";

export const dynamic = "force-dynamic";

export default async function KayitPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const settings = await getSystemSettings();
  const { ref } = await searchParams;

  // Kayıtlar kapalıysa formu hiç gösterme — API zaten reddediyor ama
  // formu doldurtup sonra hata vermek kötü deneyim.
  if (!settings["system.newMemberRegistration"]) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-subtle border border-subtle grid place-items-center mx-auto mb-6">
          <UserX className="w-8 h-8 text-faint" />
        </div>
        <h1 className="h-display text-3xl">Kayıtlar geçici olarak kapalı</h1>
        <p className="mt-3 text-body">
          Şu anda yeni üye kaydı alınmıyor. Üyelik için salonumuzla iletişime geçebilir
          ya da daha sonra tekrar deneyebilirsin.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-primary btn-lg">Anasayfaya dön</Link>
          <Link href="/giris" className="btn-secondary btn-lg">Giriş yap</Link>
        </div>
      </div>
    );
  }

  return <KayitForm initialRef={ref ?? ""} />;
}
